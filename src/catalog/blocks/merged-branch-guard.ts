import type { BuildingBlock } from "../types.js";

export const mergedBranchGuard: BuildingBlock = {
  id: "merged-branch-guard",
  name: "Merged Branch Guard",
  description: "Blocks git commit on branches already merged into main or on main/master directly",
  category: "quality",
  event: "PreToolUse",
  matcher: "Bash",
  canBlock: true,
  params: [
    {
      name: "baseBranch",
      type: "string",
      description: "Base branch to check merge status against (default: main)",
      required: false,
      default: "main",
    },
  ],
  tags: ["git", "workflow", "guard"],
  template: `#!/bin/bash
set -euo pipefail
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# git commit 커맨드가 아니면 통과
if ! echo "$COMMAND" | grep -qE "git commit"; then
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# 브랜치 감지 실패 시 통과
if [[ -z "$CURRENT_BRANCH" ]]; then
  exit 0
fi

# main/master 직접 커밋 차단
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  echo "{\\"decision\\": \\"block\\", \\"reason\\": \\"oh-my-harness: $CURRENT_BRANCH 브랜치에 직접 커밋할 수 없습니다. 새 브랜치를 생성하세요\\"}"
  exit 0
fi

# 이미 머지된 브랜치인지 확인
git fetch origin {{baseBranch}} --quiet 2>/dev/null || true
if git branch --merged origin/{{baseBranch}} 2>/dev/null | grep -qE "^\\*?\\s+$CURRENT_BRANCH$"; then
  echo "{\\"decision\\": \\"block\\", \\"reason\\": \\"oh-my-harness: $CURRENT_BRANCH 브랜치는 이미 {{baseBranch}}에 머지되었습니다. 새 브랜치를 생성하세요\\"}"
  exit 0
fi

exit 0`,
};
