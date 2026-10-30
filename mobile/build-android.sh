#!/usr/bin/env bash
# Aile Ligi — Android build betiği
# Kullanım:  ./build-android.sh          (AAB + APK üretir, ~/Downloads'a indirir)
#            ./build-android.sh aab      (yalnızca Play için AAB)
#            ./build-android.sh apk      (yalnızca telefona kurulabilir APK)
# Gereksinimler: Expo hesabına giriş (npx eas-cli login), credentials.json +
# credentials/ klasörü (mevcut imza anahtarı), ağ bağlantısı.
set -euo pipefail
cd "$(dirname "$0")"

WHAT="${1:-both}"

echo "==> TypeScript kontrolü"
npx tsc --noEmit

ids=()
if [ "$WHAT" = "both" ] || [ "$WHAT" = "aab" ]; then
  echo "==> AAB (production) build kuyruğa alınıyor"
  id=$(npx eas-cli build -p android --profile production --non-interactive --no-wait 2>&1 \
    | grep -oE 'builds/[a-f0-9-]+' | head -1 | cut -d/ -f2)
  ids+=("aab:$id")
fi
if [ "$WHAT" = "both" ] || [ "$WHAT" = "apk" ]; then
  echo "==> APK (preview) build kuyruğa alınıyor"
  id=$(npx eas-cli build -p android --profile preview --non-interactive --no-wait 2>&1 \
    | grep -oE 'builds/[a-f0-9-]+' | head -1 | cut -d/ -f2)
  ids+=("apk:$id")
fi

echo "==> Build bitene kadar bekleniyor (tipik: 5-10 dk)"
for entry in "${ids[@]}"; do
  kind="${entry%%:*}"; id="${entry##*:}"
  while :; do
    status=$(npx eas-cli build:view "$id" --json 2>/dev/null \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).status)}catch(e){console.log("?")}})')
    echo "  $(date +%H:%M:%S) $kind -> $status"
    case "$status" in
      FINISHED) break ;;
      ERRORED|CANCELED) echo "!! $kind build başarısız: https://expo.dev/accounts/eminmersin/projects/aile-ligi/builds/$id"; exit 1 ;;
    esac
    sleep 45
  done
done

echo "==> İndiriliyor"
version=$(node -pe "require('./app.json').expo.version")
for entry in "${ids[@]}"; do
  kind="${entry%%:*}"; id="${entry##*:}"
  url=$(npx eas-cli build:view "$id" --json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.artifacts.buildUrl)})')
  out="$HOME/Downloads/aile-ligi-$version.$kind"
  echo "  $url -> $out"
  curl -fL -o "$out" "$url"
done

echo "==> Bitti:"
ls -la "$HOME"/Downloads/aile-ligi-"$version".*
