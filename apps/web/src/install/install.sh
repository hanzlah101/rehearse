#!/bin/sh
# Installs Rehearse on macOS or Linux:
#   curl -fsSL __SITE__/install.sh | sh
#
# Served by src/routes/install[.]sh.ts, which fills in the site address. Installers
# come from the site's /download/<id> route (src/lib/downloads.ts), the
# latest GitHub Release.
#
# macOS: the app isn't notarized yet, so a disk image downloaded in a browser
# gets Gatekeeper's "could not verify" block. curl doesn't mark downloads, so
# the app installed here opens straight away.
set -eu

SITE="__SITE__"
APP="Rehearse"

tmp=$(mktemp -d)
mounted=""
cleanup() {
	if [ -n "$mounted" ]; then
		hdiutil detach -quiet "$mounted" || true
	fi
	rm -rf "$tmp"
}
trap cleanup EXIT

fail() {
	echo "Error: $1" >&2
	exit 1
}

download() {
	echo "Downloading $APP..."
	curl -fL --progress-bar -o "$2" "$SITE/download/$1" ||
		fail "couldn't download $APP. Check your connection and try again."
}

# sudo only where the user can't write.
as_admin() {
	if [ "$(id -u)" -eq 0 ]; then
		"$@"
	else
		sudo "$@"
	fi
}

install_macos() {
	# Apple silicon even when this shell runs under Rosetta.
	if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
		id="macos"
	else
		id="macos-intel"
	fi
	dmg="$tmp/$APP.dmg"
	download "$id" "$dmg"

	mounted="$tmp/mount"
	hdiutil attach -nobrowse -readonly -quiet -mountpoint "$mounted" "$dmg" ||
		fail "the download isn't a disk image. Try again in a few minutes."

	[ -d "$mounted/$APP.app" ] || fail "the disk image has no $APP.app. Try again in a few minutes."

	target="/Applications/$APP.app"
	if [ -w /Applications ]; then
		rm -rf "$target"
		ditto "$mounted/$APP.app" "$target"
	else
		echo "Installing to /Applications needs your password."
		as_admin rm -rf "$target"
		as_admin ditto "$mounted/$APP.app" "$target"
	fi
	# Nothing should be marked, but an earlier browser download may have been.
	xattr -dr com.apple.quarantine "$target" 2>/dev/null || true

	echo "$APP is installed in /Applications. Opening it..."
	open "$target"
}

install_linux() {
	[ "$(uname -m)" = "x86_64" ] || fail "$APP for Linux is only built for x86_64."

	if command -v apt-get >/dev/null 2>&1; then
		package="$tmp/$APP.deb"
		download linux-deb "$package"
		echo "Installing the package needs your password."
		as_admin apt-get install -y "$package"
	elif command -v dnf >/dev/null 2>&1; then
		package="$tmp/$APP.rpm"
		download linux-rpm "$package"
		echo "Installing the package needs your password."
		as_admin dnf install -y "$package"
	elif command -v zypper >/dev/null 2>&1; then
		package="$tmp/$APP.rpm"
		download linux-rpm "$package"
		echo "Installing the package needs your password."
		as_admin zypper --non-interactive install --allow-unsigned-rpm "$package"
	else
		# No package manager we know: the AppImage, which runs on its own.
		bin="$HOME/.local/bin"
		mkdir -p "$bin"
		download linux "$bin/$APP.AppImage"
		chmod +x "$bin/$APP.AppImage"
		echo "$APP is installed: $bin/$APP.AppImage"
		return
	fi
	echo "$APP is installed. Open it from your applications menu."
}

case "$(uname -s)" in
Darwin) install_macos ;;
Linux) install_linux ;;
*) fail "this installs $APP on macOS and Linux. On Windows, see $SITE." ;;
esac
