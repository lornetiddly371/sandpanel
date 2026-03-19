package rcon

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	typeResponse = 0
	typeCommand  = 2
	typeAuth     = 3
)

// Client provides thread-safe communication with an Insurgency Sandstorm
// RCON server using the Source RCON wire protocol.
type Client struct {
	addr     string
	password string
	timeout  time.Duration

	mu        sync.Mutex
	conn      net.Conn
	idCounter int32
}

// Player holds the parsed fields returned by a "listplayers" command.
type Player struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	PlatformID string `json:"platformId"`
	SteamID    string `json:"steamId"`
	IP         string `json:"ip"`
	Score      int    `json:"score"`
	IsBot      bool   `json:"isBot"`
}

// New creates a new RCON client targeting host:port.
func New(host string, port int, password string, timeout time.Duration) *Client {
	return &Client{
		addr:     fmt.Sprintf("%s:%d", host, port),
		password: password,
		timeout:  timeout,
	}
}

func (c *Client) nextID() int32 {
	c.idCounter++
	return c.idCounter
}

// Close tears down the TCP connection.
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

// dial opens the TCP connection and authenticates.
func (c *Client) dial() error {
	conn, err := net.DialTimeout("tcp", c.addr, c.timeout)
	if err != nil {
		return err
	}
	c.conn = conn
	return c.authenticate()
}

// authenticate sends a type-3 auth packet and verifies the response.
func (c *Client) authenticate() error {
	authID := c.nextID()
	if err := c.writePacket(authID, typeAuth, c.password); err != nil {
		return fmt.Errorf("rcon auth write: %w", err)
	}
	pkt, err := c.readPacket()
	if err != nil {
		return fmt.Errorf("rcon auth read: %w", err)
	}
	if pkt.id == authID && pkt.typ == typeCommand {
		return nil // auth OK
	}
	return errors.New("rcon authentication failed")
}

// Exec sends a command and returns the full response text.
func (c *Client) Exec(command string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		if err := c.dial(); err != nil {
			return "", err
		}
	}

	cmdID := c.nextID()
	if err := c.writePacket(cmdID, typeCommand, command); err != nil {
		c.drop()
		return "", err
	}

	var fullPayload strings.Builder
	sentMirror := false

	for {
		pkt, err := c.readPacket()
		if err != nil {
			c.drop()
			return "", err
		}
		if pkt.id != cmdID {
			continue // ignore stale packets from a previous command
		}
		if pkt.typ == typeResponse {
			// Once we get the first response chunk, send a mirror packet
			// (type 0, same id) so the server echoes it back empty to
			// signal "end of response".
			if sentMirror && pkt.payload == "" {
				break // empty mirror response = end of data
			}
			fullPayload.WriteString(pkt.payload)
			if !sentMirror {
				if err := c.writePacket(cmdID, typeResponse, ""); err != nil {
					c.drop()
					return fullPayload.String(), err
				}
				sentMirror = true
			}
		} else {
			// Unexpected type — bail gracefully
			return fullPayload.String(), fmt.Errorf("unexpected response type %d", pkt.typ)
		}
	}

	return fullPayload.String(), nil
}

func (c *Client) drop() {
	if c.conn != nil {
		_ = c.conn.Close()
		c.conn = nil
	}
}

// ---------- packet I/O ----------

type packet struct {
	size    int32
	id      int32
	typ     int32
	payload string
}

func (c *Client) writePacket(id, typ int32, body string) error {
	if c.conn == nil {
		return errors.New("rcon: not connected")
	}
	payload := []byte(body)
	payload = append(payload, 0x00) // single null terminator

	pktSize := int32(4 + 4 + len(payload)) // id(4) + type(4) + payload+null
	buf := &bytes.Buffer{}
	_ = binary.Write(buf, binary.LittleEndian, pktSize)
	_ = binary.Write(buf, binary.LittleEndian, id)
	_ = binary.Write(buf, binary.LittleEndian, typ)
	buf.Write(payload)

	if err := c.conn.SetWriteDeadline(time.Now().Add(c.timeout)); err != nil {
		return err
	}
	_, err := c.conn.Write(buf.Bytes())
	return err
}

func (c *Client) readPacket() (*packet, error) {
	if c.conn == nil {
		return nil, errors.New("rcon: not connected")
	}
	if err := c.conn.SetReadDeadline(time.Now().Add(c.timeout)); err != nil {
		return nil, err
	}

	// 1. read 4-byte size header
	sizeBytes := make([]byte, 4)
	if _, err := io.ReadFull(c.conn, sizeBytes); err != nil {
		return nil, err
	}
	pktSize := int32(binary.LittleEndian.Uint32(sizeBytes))
	if pktSize < 8 || pktSize > 64*1024 {
		return nil, fmt.Errorf("rcon: invalid packet size %d", pktSize)
	}

	// 2. read the rest of the packet
	body := make([]byte, pktSize)
	if _, err := io.ReadFull(c.conn, body); err != nil {
		return nil, err
	}

	id := int32(binary.LittleEndian.Uint32(body[0:4]))
	typ := int32(binary.LittleEndian.Uint32(body[4:8]))

	// Payload sits between the type field and the trailing null(s)
	data := body[8:]
	// Strip trailing nulls
	data = bytes.TrimRight(data, "\x00")

	return &packet{size: pktSize, id: id, typ: typ, payload: string(data)}, nil
}

// ---------- listplayers parser ----------

func (c *Client) ListPlayers() ([]Player, []Player, error) {
	resp, err := c.Exec("listplayers")
	if err != nil {
		return nil, nil, err
	}
	if strings.TrimSpace(resp) == "Invalid gamestate" {
		return nil, nil, fmt.Errorf("invalid gamestate")
	}
	lines := strings.Split(strings.ReplaceAll(resp, "\r\n", "\n"), "\n")
	playersText := ""
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.TrimSpace(lines[i]) != "" {
			playersText = lines[i]
			break
		}
	}
	if playersText == "" {
		return nil, nil, nil
	}
	rawEntries := strings.FieldsFunc(playersText, func(r rune) bool { return r == '\t' })
	chunks := make([][]string, 0, len(rawEntries)/5)
	current := make([]string, 0, 5)
	for _, entry := range rawEntries {
		entry = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(entry), "|"))
		if entry == "" {
			continue
		}
		current = append(current, entry)
		if len(current) == 5 {
			chunks = append(chunks, current)
			current = make([]string, 0, 5)
		}
	}
	steamIDRe := regexp.MustCompile(`SteamNWI:(\d{17})$`)
	players := []Player{}
	bots := []Player{}
	for _, chunk := range chunks {
		score := 0
		fmt.Sscanf(chunk[4], "%d", &score)
		player := Player{
			ID:         firstMatch(chunk[0], `\d+`),
			Name:       strings.TrimSpace(chunk[1]),
			PlatformID: strings.TrimSpace(chunk[2]),
			SteamID:    firstSubmatch(steamIDRe, chunk[2]),
			IP:         strings.TrimSpace(chunk[3]),
			Score:      score,
		}
		if player.ID == "" || player.PlatformID == "" {
			continue
		}
		player.IsBot = player.PlatformID == "None:INVALID"
		if player.IsBot {
			bots = append(bots, player)
			continue
		}
		if !isIPv4(player.IP) {
			continue
		}
		players = append(players, player)
	}
	return players, bots, nil
}

func firstMatch(input, expr string) string {
	re := regexp.MustCompile(expr)
	return re.FindString(input)
}

func firstSubmatch(re *regexp.Regexp, input string) string {
	matches := re.FindStringSubmatch(input)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

func isIPv4(s string) bool {
	ip := net.ParseIP(s)
	return ip != nil && ip.To4() != nil
}
