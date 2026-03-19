package modio

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const gameID = 254
const defaultEmailRequestAPIKey = "bbf3af200848aef28418c032a601e7a2"

type ModSummary struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Summary     string   `json:"summary"`
	ProfileURL  string   `json:"profileUrl"`
	Author      string   `json:"author"`
	Logo        string   `json:"logo"`
	Subscribers int      `json:"subscribers"`
	Downloads   int      `json:"downloads"`
	Rating      string   `json:"rating"`
	Tags        []string `json:"tags"`
	DateUpdated int64    `json:"dateUpdated"`
}

type ExploreQuery struct {
	Search   string
	Sort     string
	Page     int
	PageSize int
}

type ExploreResult struct {
	Mods       []ModSummary `json:"mods"`
	Page       int          `json:"page"`
	PageSize   int          `json:"pageSize"`
	Total      int          `json:"total"`
	Resultable int          `json:"resultable"`
}

type modResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Summary     string `json:"summary"`
	ProfileURL  string `json:"profile_url"`
	DateUpdated int64  `json:"date_updated"`
	SubmittedBy struct {
		Username string `json:"username"`
	} `json:"submitted_by"`
	Logo struct {
		Thumb320 string `json:"thumb_320x180"`
	} `json:"logo"`
	Stats struct {
		Subscribers int    `json:"subscribers_total"`
		Downloads   int    `json:"downloads_total"`
		Rating      string `json:"ratings_display_text"`
	} `json:"stats"`
	Tags []struct {
		Name string `json:"name"`
	} `json:"tags"`
}

type listResponse struct {
	Data       []modResponse `json:"data"`
	ResultCount int          `json:"result_count"`
	ResultTotal int          `json:"result_total"`
	ResultLimit int          `json:"result_limit"`
	ResultOffset int         `json:"result_offset"`
}

func (m *Manager) RequestSecurityCode(email string) (map[string]any, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	form := url.Values{}
	form.Set("email", email)
	endpoint := fmt.Sprintf("https://g-%d.modapi.io/v1/oauth/emailrequest?api_key=%s", gameID, defaultEmailRequestAPIKey)
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("mod.io email request failed: %s", strings.TrimSpace(string(body)))
	}
	decoded := map[string]any{}
	if len(bytes.TrimSpace(body)) == 0 {
		return map[string]any{"code": resp.StatusCode, "message": "empty response"}, nil
	}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return map[string]any{"code": resp.StatusCode, "message": strings.TrimSpace(string(body))}, nil
	}
	return decoded, nil
}

func (m *Manager) Subscribe(id string) error {
	return m.updateSubscription(id, http.MethodPost)
}

func (m *Manager) Unsubscribe(id string) error {
	return m.updateSubscription(id, http.MethodDelete)
}

func (m *Manager) ClearModCache(id string) error {
	id = strings.TrimSpace(id)
	if !isNumericID(id) {
		return fmt.Errorf("invalid mod id")
	}
	target := filepath.Clean(filepath.Join(m.StateRoot, "common", "254", "mods", id))
	root := filepath.Clean(filepath.Join(m.StateRoot, "common", "254", "mods"))
	if !strings.HasPrefix(target, root+string(filepath.Separator)) {
		return fmt.Errorf("invalid mod path")
	}
	return os.RemoveAll(target)
}

func (m *Manager) updateSubscription(id, method string) error {
	id = strings.TrimSpace(id)
	if !isNumericID(id) {
		return fmt.Errorf("invalid mod id")
	}
	token, err := m.oauthToken()
	if err != nil || token == "" {
		return fmt.Errorf("mod.io OAuth token missing from %s", m.userFilePath())
	}
	endpoint := fmt.Sprintf("https://g-%d.modapi.io/v1/games/%d/mods/%s/subscribe", gameID, gameID, id)
	req, err := http.NewRequest(method, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("mod.io subscription request failed: %s", strings.TrimSpace(string(body)))
	}
	return nil
}

func (m *Manager) FetchMods(ids []string) ([]ModSummary, error) {
	token, err := m.oauthToken()
	if err != nil || token == "" {
		return nil, fmt.Errorf("mod.io OAuth token missing from %s", m.userFilePath())
	}
	client := &http.Client{Timeout: 20 * time.Second}
	out := make([]ModSummary, len(ids))
	errs := make([]string, 0)
	var mu sync.Mutex
	var wg sync.WaitGroup
	for i, id := range ids {
		i, id := i, strings.TrimSpace(id)
		if id == "" {
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("https://api.mod.io/v1/games/%d/mods/%s", gameID, id), nil)
			if err != nil {
				mu.Lock()
				errs = append(errs, err.Error())
				mu.Unlock()
				return
			}
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := client.Do(req)
			if err != nil {
				mu.Lock()
				errs = append(errs, fmt.Sprintf("%s: %v", id, err))
				mu.Unlock()
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode >= 300 {
				mu.Lock()
				errs = append(errs, fmt.Sprintf("%s: mod.io returned %s", id, resp.Status))
				mu.Unlock()
				return
			}
			var decoded modResponse
			if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
				mu.Lock()
				errs = append(errs, fmt.Sprintf("%s: %v", id, err))
				mu.Unlock()
				return
			}
			tags := make([]string, 0, len(decoded.Tags))
			for _, tag := range decoded.Tags {
				tags = append(tags, tag.Name)
			}
			out[i] = ModSummary{
				ID:          decoded.ID,
				Name:        decoded.Name,
				Summary:     decoded.Summary,
				ProfileURL:  decoded.ProfileURL,
				Author:      decoded.SubmittedBy.Username,
				Logo:        decoded.Logo.Thumb320,
				Subscribers: decoded.Stats.Subscribers,
				Downloads:   decoded.Stats.Downloads,
				Rating:      decoded.Stats.Rating,
				Tags:        tags,
				DateUpdated: decoded.DateUpdated,
			}
		}()
	}
	wg.Wait()
	filtered := make([]ModSummary, 0, len(out))
	for _, item := range out {
		if item.ID != 0 {
			filtered = append(filtered, item)
		}
	}
	if len(errs) > 0 && len(filtered) == 0 {
		return nil, fmt.Errorf(strings.Join(errs, "; "))
	}
	return filtered, nil
}

func (m *Manager) ExploreMods(q ExploreQuery) (ExploreResult, error) {
	page := q.Page
	if page < 1 {
		page = 1
	}
	pageSize := q.PageSize
	if pageSize <= 0 {
		pageSize = 24
	}
	if pageSize > 100 {
		pageSize = 100
	}

	params := url.Values{}
	params.Set("api_key", defaultEmailRequestAPIKey)
	params.Set("_offset", fmt.Sprintf("%d", (page-1)*pageSize))
	params.Set("_limit", fmt.Sprintf("%d", pageSize))
	params.Set("_filter_visible", "1")

	sort := strings.TrimSpace(strings.ToLower(q.Sort))
	if sort == "" {
		sort = "trending"
	}
	switch sort {
	case "downloads", "popular":
		params.Set("_sort", "-downloads_today")
	case "subscribers":
		params.Set("_sort", "-subscribers_total")
	case "latest", "updated":
		params.Set("_sort", "-date_updated")
	case "rating":
		params.Set("_sort", "-rating_weighted")
	default:
		params.Set("_sort", "-popular")
	}

	search := strings.TrimSpace(q.Search)
	if search != "" {
		params.Set("_q", search)
	}

	endpoint := fmt.Sprintf("https://api.mod.io/v1/games/%d/mods?%s", gameID, params.Encode())
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return ExploreResult{}, err
	}
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return ExploreResult{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return ExploreResult{}, err
	}
	if resp.StatusCode >= 300 {
		return ExploreResult{}, fmt.Errorf("mod.io explore request failed: %s", strings.TrimSpace(string(body)))
	}

	var decoded listResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		return ExploreResult{}, err
	}

	out := make([]ModSummary, 0, len(decoded.Data))
	for _, raw := range decoded.Data {
		out = append(out, convertMod(raw))
	}

	return ExploreResult{
		Mods:       out,
		Page:       page,
		PageSize:   pageSize,
		Total:      decoded.ResultTotal,
		Resultable: decoded.ResultCount,
	}, nil
}

func convertMod(decoded modResponse) ModSummary {
	tags := make([]string, 0, len(decoded.Tags))
	for _, tag := range decoded.Tags {
		tags = append(tags, tag.Name)
	}
	return ModSummary{
		ID:          decoded.ID,
		Name:        decoded.Name,
		Summary:     decoded.Summary,
		ProfileURL:  decoded.ProfileURL,
		Author:      decoded.SubmittedBy.Username,
		Logo:        decoded.Logo.Thumb320,
		Subscribers: decoded.Stats.Subscribers,
		Downloads:   decoded.Stats.Downloads,
		Rating:      decoded.Stats.Rating,
		Tags:        tags,
		DateUpdated: decoded.DateUpdated,
	}
}

func isNumericID(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
