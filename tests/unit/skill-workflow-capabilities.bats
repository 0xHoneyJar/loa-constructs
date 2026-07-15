#!/usr/bin/env bats

setup() {
    PROJECT_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
}

frontmatter() {
    awk '/^---$/{if(n++) exit; next} n' "$1"
}

@test "workflow prose and capability manifests agree for RTFM, Ride, and discovery" {
    for skill_root in .claude .agents; do
        rtfm_fm="$(frontmatter "$PROJECT_ROOT/$skill_root/skills/rtfm-testing/SKILL.md")"
        [ "$(echo "$rtfm_fm" | yq eval '.capabilities.write_files' -)" = "true" ]
        [ "$(echo "$rtfm_fm" | yq eval '.capabilities.agent_spawn' -)" = "true" ]
        [[ "$(echo "$rtfm_fm" | yq eval '.allowed-tools' -)" == *"Write"* ]]
        [[ "$(echo "$rtfm_fm" | yq eval '.allowed-tools' -)" == *"Task"* ]]

        ride_fm="$(frontmatter "$PROJECT_ROOT/$skill_root/skills/riding-codebase/SKILL.md")"
        [ "$(echo "$ride_fm" | yq eval '.capabilities.user_interaction' -)" = "true" ]
        [[ "$(echo "$ride_fm" | yq eval '.allowed-tools' -)" == *"AskUserQuestion"* ]]

        discovery_fm="$(frontmatter "$PROJECT_ROOT/$skill_root/skills/discovering-requirements/SKILL.md")"
        [ "$(echo "$discovery_fm" | yq eval '.capabilities.agent_spawn' -)" = "true" ]
        [[ "$(echo "$discovery_fm" | yq eval '.allowed-tools' -)" == *"Task"* ]]
    done
}
