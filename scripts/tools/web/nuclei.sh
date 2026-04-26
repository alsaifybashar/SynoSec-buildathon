#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nuclei >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Nuclei could not run because nuclei is not installed.","statusReason":"Missing required binary: nuclei"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const base=String(toolInput.baseUrl||toolInput.url||toolInput.startUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`);const vt=Array.isArray(toolInput.validationTargets)&&toolInput.validationTargets[0];const candidate=vt?(vt.url||vt.endpoint||vt.path):Array.isArray(toolInput.candidateEndpoints)&&toolInput.candidateEndpoints[0];process.stdout.write(new URL(String(candidate||base),base).toString());')"
scan_timeout_seconds="10"
templates_dir="${NUCLEI_TEMPLATES_DIR:-$HOME/nuclei-templates}"

if [ ! -d "$templates_dir" ]; then
  printf '{"output":"Nuclei could not run because the template directory %s is missing.","statusReason":"Missing nuclei templates directory","commandPreview":"nuclei"}\n' "$templates_dir"
  exit 127
fi

template_args=(
  -t "$templates_dir/http/exposures/configs/phpinfo-files.yaml"
  -t "$templates_dir/http/exposures/configs/httpd-config.yaml"
  -t "$templates_dir/http/exposures/configs/htpasswd-detection.yaml"
  -t "$templates_dir/http/exposures/configs/php-fpm-config.yaml"
  -t "$templates_dir/http/exposures/files/php-ini.yaml"
  -t "$templates_dir/http/exposed-panels/phpmyadmin-panel.yaml"
  -t "$templates_dir/http/exposed-panels/adminer-panel.yaml"
)

for template_path in "${template_args[@]}"; do
  if [ "$template_path" = "-t" ]; then
    continue
  fi
  if [ ! -f "$template_path" ]; then
    printf '{"output":"Nuclei could not run because the required template %s is missing.","statusReason":"Missing required nuclei template","commandPreview":"nuclei"}\n' "$template_path"
    exit 127
  fi
done

scan_command="nuclei -u $target ${template_args[*]} -nc -duc -ni -timeout 4 -retries 0 -c 3 -bs 5 -silent"
escaped_command="$(node -p "JSON.stringify(process.argv[1])" "$scan_command")"

set +e
output="$(timeout "${scan_timeout_seconds}s" nuclei -u "$target" "${template_args[@]}" -nc -duc -ni -timeout 4 -retries 0 -c 3 -bs 5 -silent 2>&1)"
status=$?
set -e
if [ "$status" -ne 0 ]; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  if [ "$status" -eq 124 ]; then
    printf '{"output":"Nuclei timed out after %ss while running a bounded web template set against %s.","statusReason":"Nuclei timed out","commandPreview":%s}\n' "$scan_timeout_seconds" "$target" "$escaped_command"
    exit 64
  fi
  printf '{"output":%s,"statusReason":"Nuclei failed","commandPreview":%s}\n' "$escaped_output" "$escaped_command"
  exit 64
fi

if [ -z "$output" ]; then
  output="Nuclei completed the bounded web template scan against $target and did not emit any findings."
fi

summary="Nuclei completed a bounded web template assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"nuclei:%s","title":"Nuclei completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Bounded Nuclei web assessment"}],"commandPreview":%s}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$escaped_command"
