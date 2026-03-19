package catalog

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type Data struct {
	Maps           []Option            `json:"maps"`
	Scenarios      []Option            `json:"scenarios"`
	ScenariosByMap map[string][]Option `json:"scenariosByMap"`
	Mutators       []Option            `json:"mutators"`
}

var officialMaps = map[string]string{
	"Bab":        "Bab",
	"Buhriz":     "Tideway",
	"Canyon":     "Crossing",
	"Citadel":    "Citadel",
	"Compound":   "Outskirts",
	"Farmhouse":  "Farmhouse",
	"Forest":     "Forest",
	"Gap":        "Gap",
	"LastLight":  "LastLight",
	"Ministry":   "Ministry",
	"Mountain":   "Summit",
	"Oilfield":   "Refinery",
	"PowerPlant": "PowerPlant",
	"Precinct":   "Precinct",
	"Prison":     "Prison",
	"Sinjar":     "Hillside",
	"Tell":       "Tell",
	"Town":       "Hideout",
	"Trainyard":  "Trainyard",
}

var officialMutators = map[string]string{
	"AllYouCanEat":           "All You Can Eat",
	"AntiMaterielRiflesOnly": "Anti-Materiel Only",
	"BoltActionsOnly":        "Bolt-Actions Only",
	"Broke":                  "Broke",
	"BudgetAntiquing":        "Budget Antiquing",
	"BulletSponge":           "Bullet Sponge",
	"Competitive":            "Competitive",
	"CompetitiveLoadouts":    "Competitive Loadouts",
	"FastMovement":           "Fast Movement",
	"Frenzy":                 "Frenzy",
	"FullyLoaded":            "Fully Loaded",
	"Guerrillas":             "Guerrillas",
	"Gunslingers":            "Gunslingers",
	"Hardcore":               "Hardcore",
	"HeadshotOnly":           "Headshots Only",
	"HotPotato":              "Hot Potato",
	"LockedAim":              "Locked Aim",
	"MakarovsOnly":           "Makarovs Only",
	"NoAim":                  "No Aim Down Sights",
	"NoDrops":                "No Drops",
	"PistolsOnly":            "Pistols Only",
	"Poor":                   "Poor",
	"ShotgunsOnly":           "Shotguns Only",
	"SlowCaptureTimes":       "Slow Capture Times",
	"SlowMovement":           "Slow Movement",
	"SoldierOfFortune":       "Soldier of Fortune",
	"SpecialOperations":      "Special Operations",
	"Strapped":               "Strapped",
	"Ultralethal":            "Ultralethal",
	"Vampirism":              "Vampirism",
	"Warlords":               "Warlords",
	"MoreAmmo":               "More Ammo",
	"NoRestrictPlus":         "No Restrict Plus",
}

func Load(configRoot string, extraMutators []string) Data {
	mapOptions := map[string]Option{}
	for source, travel := range officialMaps {
		label := travel
		if source != travel {
			label = source + " / " + travel
		}
		mapOptions[travel] = Option{Value: travel, Label: label}
	}
	scenariosByMap := map[string]map[string]Option{}
	addMap := func(value, label string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if label == "" {
			label = value
		}
		mapOptions[value] = Option{Value: value, Label: label}
	}
	addScenario := func(mapName, value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if strings.TrimSpace(mapName) == "" {
			mapName = inferScenarioMap(value)
		}
		addMap(mapName, mapOptions[mapName].Label)
		if scenariosByMap[mapName] == nil {
			scenariosByMap[mapName] = map[string]Option{}
		}
		label := strings.ReplaceAll(strings.TrimPrefix(value, "Scenario_"), "_", " ")
		scenariosByMap[mapName][value] = Option{Value: value, Label: label}
	}
	maps := make([]Option, 0, len(mapOptions))
	for _, item := range mapOptions {
		maps = append(maps, item)
	}
	sort.Slice(maps, func(i, j int) bool { return maps[i].Label < maps[j].Label })

	for _, mapName := range maps {
		addScenario(mapName.Value, "Scenario_"+mapName.Value+"_Checkpoint_Security")
		addScenario(mapName.Value, "Scenario_"+mapName.Value+"_Checkpoint_Insurgents")
	}
	for _, name := range []string{"MapCycle.txt", "ModScenarios.txt"} {
		body, err := os.ReadFile(filepath.Join(configRoot, name))
		if err != nil {
			continue
		}
		for _, line := range strings.Split(strings.ReplaceAll(string(body), "\r\n", "\n"), "\n") {
			line = strings.TrimSpace(line)
			if root := travelRoot(line); root != "" {
				addMap(root, root)
			}
			if strings.Contains(line, "Scenario=") {
				if idx := strings.Index(line, "Scenario=\""); idx >= 0 {
					rest := line[idx+10:]
					if end := strings.Index(rest, "\""); end >= 0 {
						addScenario(travelRoot(line), rest[:end])
					}
				} else if idx := strings.Index(line, "Scenario="); idx >= 0 {
					rest := line[idx+9:]
					if end := strings.Index(rest, "?"); end >= 0 {
						addScenario(travelRoot(line), rest[:end])
					} else {
						addScenario(travelRoot(line), rest)
					}
				}
			}
		}
	}
	maps = maps[:0]
	for _, item := range mapOptions {
		maps = append(maps, item)
	}
	sort.Slice(maps, func(i, j int) bool { return maps[i].Label < maps[j].Label })
	scenarioMap := map[string]Option{}
	scenarioList := make([]Option, 0)
	grouped := map[string][]Option{}
	for mapName, items := range scenariosByMap {
		list := make([]Option, 0, len(items))
		for _, item := range items {
			list = append(list, item)
			scenarioMap[item.Value] = item
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Label < list[j].Label })
		grouped[mapName] = list
	}
	for _, item := range scenarioMap {
		scenarioList = append(scenarioList, item)
	}
	sort.Slice(scenarioList, func(i, j int) bool { return scenarioList[i].Label < scenarioList[j].Label })

	mutatorMap := map[string]Option{}
	for key, label := range officialMutators {
		mutatorMap[key] = Option{Value: key, Label: label}
	}
	for _, extra := range extraMutators {
		extra = strings.TrimSpace(extra)
		if extra == "" {
			continue
		}
		if _, ok := mutatorMap[extra]; !ok {
			mutatorMap[extra] = Option{Value: extra, Label: extra}
		}
	}
	mutatorList := make([]Option, 0, len(mutatorMap))
	for _, item := range mutatorMap {
		mutatorList = append(mutatorList, item)
	}
	sort.Slice(mutatorList, func(i, j int) bool { return mutatorList[i].Label < mutatorList[j].Label })

	return Data{
		Maps:           maps,
		Scenarios:      scenarioList,
		ScenariosByMap: grouped,
		Mutators:       mutatorList,
	}
}

func travelRoot(line string) string {
	line = strings.TrimSpace(line)
	if line == "" || strings.HasPrefix(line, "(") || strings.HasPrefix(line, ";") || strings.HasPrefix(line, "#") {
		return ""
	}
	if idx := strings.Index(line, "?"); idx > 0 {
		return strings.TrimSpace(line[:idx])
	}
	return ""
}

func inferScenarioMap(scenario string) string {
	scenario = strings.TrimPrefix(strings.TrimSpace(scenario), "Scenario_")
	if scenario == "" {
		return ""
	}
	parts := strings.Split(scenario, "_")
	if len(parts) == 0 {
		return ""
	}
	return parts[0]
}
