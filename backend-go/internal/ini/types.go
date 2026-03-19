package ini

type NodeType string

const (
	NodeSection NodeType = "section"
	NodeEntry   NodeType = "entry"
	NodeComment NodeType = "comment"
	NodeBlank   NodeType = "blank"
	NodeRaw     NodeType = "raw"
)

type Node struct {
	Type    NodeType `json:"type"`
	Raw     string   `json:"raw,omitempty"`
	Section string   `json:"section,omitempty"`
	Prefix  string   `json:"prefix,omitempty"`
	Key     string   `json:"key,omitempty"`
	Value   string   `json:"value,omitempty"`
	Comment string   `json:"comment,omitempty"`
	Index   int      `json:"index,omitempty"`
	Line    int      `json:"line"`
}

type Document struct {
	Nodes []Node `json:"nodes"`
}

type ValueType string

const (
	ValueBool   ValueType = "bool"
	ValueNumber ValueType = "number"
	ValueSecret ValueType = "secret"
	ValueString ValueType = "string"
)

type Field struct {
	Section string    `json:"section"`
	Prefix  string    `json:"prefix"`
	Key     string    `json:"key"`
	Label   string    `json:"label"`
	Value   string    `json:"value"`
	Comment string    `json:"comment,omitempty"`
	Type    ValueType `json:"type"`
	Index   int       `json:"index"`
}

type Schema struct {
	Sections map[string][]Field `json:"sections"`
}

type Parsed struct {
	Raw    string   `json:"raw"`
	Doc    Document `json:"doc"`
	Schema Schema   `json:"schema"`
}
