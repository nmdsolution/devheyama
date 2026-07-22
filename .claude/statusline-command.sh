#!/usr/bin/env bash
# Claude Code statusline: shows model, cwd, and context-window / token usage.
# Reads the JSON payload Claude Code pipes to statusLine commands on stdin.

input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "?"')
dir_name=$(basename "$(echo "$input" | jq -r '.workspace.current_dir // empty')" 2>/dev/null)

used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // empty')
window_size=$(echo "$input" | jq -r '.context_window.context_window_size // empty')

if [ -n "$used_pct" ]; then
  ctx=$(printf "ctx %.0f%%" "$used_pct")
  if [ -n "$total_in" ] && [ -n "$window_size" ]; then
    ctx="$ctx (${total_in}/${window_size} tok)"
  fi
else
  ctx="ctx n/a"
fi

five=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
limits=""
[ -n "$five" ] && limits="5h:$(printf '%.0f' "$five")%"
[ -n "$week" ] && limits="${limits:+$limits }7d:$(printf '%.0f' "$week")%"

# Dim colors (2 = dim/faint) so the line fits Claude Code's footer styling.
printf "\033[2m%s\033[0m \033[2m%s\033[0m \033[2m|\033[0m \033[2m%s\033[0m" "$model" "$dir_name" "$ctx"
if [ -n "$limits" ]; then
  printf " \033[2m|\033[0m \033[2m%s\033[0m" "$limits"
fi
