<h4>Fork of ad-on-is/lidarr-deemix with some small improvements. Should be considered experimental</h4>

- Configurable url for metadata server (currently defaults to api.musicinfo.pro)
- Adds deemix release into musicbrainz release group where possible so both can be visible to Lidarr
- Improved handling and matching of release titles
- Re-implemented live album detection based on track tags
- Artists tagged with mb_only will not have deemix results returned that are not also on musicbrainz. Useful when there's multiple artists with the same name

---
<div align="center">
<img src="./images/logo.webp" height="200" /><br />
<h1>Lidarr++Deemix</h1>
<h4 style="font-style: italic">"If Lidarr and Deemix had a child"</h4>
</div>

![container](https://github.com/ad-on-is/lidarr-deemix/actions/workflows/container.yml/badge.svg?branch=)
[![Version](https://img.shields.io/github/tag/ad-on-is/lidarr-deemix.svg?style=flat?branch=)]()
[![GitHub stars](https://img.shields.io/github/stars/ad-on-is/lidarr-deemix.svg?style=social&label=Star)]()
[![GitHub watchers](https://img.shields.io/github/watchers/ad-on-is/lidarr-deemix.svg?style=social&label=Watch)]()
[![GitHub forks](https://img.shields.io/github/forks/ad-on-is/lidarr-deemix.svg?style=social&label=Fork)]()

## 💡 How it works

Lidarr usually pulls artist and album infos from their own api api.lidarr.audio, which pulls the data from MusicBrainz.

However, MusicBrainz does not have many artists/albums, especially for some regional _niche_ artist.

This tool helps to enrich Lidarr, by providing a custom proxy, that _hooks into_ the process _without modifying Lidarr itself_, and **_injects additional artists/albums from deemix_**.

#### To do that, the following steps are performed:

- [mitmproxy](https://mitmproxy.org/) runs as a proxy
- Lidarr needs to be configured to use that proxy.
- The proxy then **_redirects all_** api.lidarr.audio calls to an internally running **NodeJS service** (_127.0.0.1:7171_)
- That NodeJS service **enriches** the missing artists/albums with the ones found in deemix
- Lidarr has now additiona artists/albums, and can do its thing.

## 💻️ Installation

> [!CAUTION]
> If you have installed an older version, please adjust the Proxy settings as described below, otherwise the HTTP-requests will fail

> [!WARNING]
> This image does not come with Lidarr nor with the deemix-gui. It's an addition to your existing setup.

> [!NOTE]
> The previous setup required to map additional volumes for certificate validation. Thx to @codefaux, here's now a simpler way for installation.

- Use the provided [docker-compose.yml](./docker-compose.yml) as an example.
  - **DEEMIX_ARL=xxx** your deezer ARL (get it from your browsers cookies)
  - **LIDARR_URL=http://lidarr:8686** The URL of your Lidarr instance (with port), so this library can communicate with it.
  - **LIDARR_API_KEY=xxx** The Lidarr API Key.
  - **LIDARR_METADATA_SERVER=https://api.lidarr.audio** URL for metadata server
  - **SELF_HOSTED_METADATA=false** Removes "/api/v0.4" from path in requests to metadata server. Set to true if self-hosting
  - **MERGE_RELEASES=true** Adds Deemix metadata into musicbrainz release group if both exist. Allows importing Deemix downloads when the number of tracks differs to the release on musicbrainz
- Go to **Lidarr -> Settings -> General**
  - **Certificate Validation:** to _Disabled_
  - **Use Proxy:** ✅
  - **Proxy Type:** HTTP(S)
  - **Hostname:** container-name/IP of the machine where lidarr-deemix is running
  - **Port:** 8080 (if using container-name), otherwise the port you exposed the service to
  - **Bypass Proxy for local addresses:** ✅

![settings](./images/lidarr-deemix-conf.png)
