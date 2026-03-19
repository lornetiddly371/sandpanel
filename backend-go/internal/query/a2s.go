package query

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"net"
	"time"
)

const (
	a2sInfoHeader  = 0x54
	a2sInfoResp    = 0x49
	a2sRulesHeader = 0x56
	a2sRulesResp   = 0x45
)

type Info struct {
	Name       string `json:"name"`
	Map        string `json:"map"`
	Folder     string `json:"folder"`
	Game       string `json:"game"`
	Players    uint8  `json:"players"`
	MaxPlayers uint8  `json:"maxPlayers"`
	Bots       uint8  `json:"bots"`
	ServerType string `json:"serverType"`
	Environment string `json:"environment"`
	Visibility uint8  `json:"visibility"`
	VAC        uint8  `json:"vac"`
}

type Client struct {
	addr    string
	timeout time.Duration
}

func New(host string, port int, timeout time.Duration) *Client {
	return &Client{addr: fmt.Sprintf("%s:%d", host, port), timeout: timeout}
}

func (c *Client) Info() (*Info, error) {
	conn, err := net.DialTimeout("udp", c.addr, c.timeout)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(c.timeout))

	packet := append([]byte{0xFF, 0xFF, 0xFF, 0xFF, a2sInfoHeader}, []byte("Source Engine Query\x00")...)
	if _, err := conn.Write(packet); err != nil {
		return nil, err
	}
	buf := make([]byte, 4096)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}
	resp := bytes.NewReader(buf[:n])
	header := make([]byte, 5)
	if _, err := resp.Read(header); err != nil {
		return nil, err
	}
	if header[4] != a2sInfoResp {
		return nil, fmt.Errorf("unexpected A2S_INFO response header: %d", header[4])
	}
	_, _ = resp.ReadByte() // protocol
	name, _ := readCString(resp)
	m, _ := readCString(resp)
	folder, _ := readCString(resp)
	game, _ := readCString(resp)
	_, _ = readUint16(resp) // app id
	players, _ := resp.ReadByte()
	maxPlayers, _ := resp.ReadByte()
	bots, _ := resp.ReadByte()
	sType, _ := resp.ReadByte()
	env, _ := resp.ReadByte()
	vis, _ := resp.ReadByte()
	vac, _ := resp.ReadByte()

	return &Info{
		Name: name, Map: m, Folder: folder, Game: game,
		Players: players, MaxPlayers: maxPlayers, Bots: bots,
		ServerType: string([]byte{sType}), Environment: string([]byte{env}),
		Visibility: vis, VAC: vac,
	}, nil
}

func (c *Client) Rules(challenge int32) (map[string]string, error) {
	conn, err := net.DialTimeout("udp", c.addr, c.timeout)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(c.timeout))

	if challenge == -1 {
		challenge = -1
	}
	packet := bytes.NewBuffer([]byte{0xFF, 0xFF, 0xFF, 0xFF, a2sRulesHeader})
	_ = binary.Write(packet, binary.LittleEndian, challenge)
	if _, err := conn.Write(packet.Bytes()); err != nil {
		return nil, err
	}

	buf := make([]byte, 8192)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}
	resp := bytes.NewReader(buf[:n])
	header := make([]byte, 5)
	if _, err := resp.Read(header); err != nil {
		return nil, err
	}
	if header[4] == 0x41 {
		var ch int32
		if err := binary.Read(resp, binary.LittleEndian, &ch); err != nil {
			return nil, err
		}
		return c.Rules(ch)
	}
	if header[4] != a2sRulesResp {
		return nil, fmt.Errorf("unexpected A2S_RULES response header: %d", header[4])
	}
	count, err := readUint16(resp)
	if err != nil {
		return nil, err
	}
	rules := make(map[string]string, count)
	for i := 0; i < int(count); i++ {
		k, _ := readCString(resp)
		v, _ := readCString(resp)
		rules[k] = v
	}
	return rules, nil
}

func readCString(r *bytes.Reader) (string, error) {
	out := []byte{}
	for {
		b, err := r.ReadByte()
		if err != nil {
			return string(out), err
		}
		if b == 0x00 {
			break
		}
		out = append(out, b)
	}
	return string(out), nil
}

func readUint16(r *bytes.Reader) (uint16, error) {
	var v uint16
	err := binary.Read(r, binary.LittleEndian, &v)
	return v, err
}
