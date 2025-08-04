import _ from "lodash";
const deemixUrl = "http://127.0.0.1:7272";
import { getAllLidarrArtists } from "./lidarr.js";
import { normalize } from "./helpers.js";
import { link } from "fs";

// Used to map deezer album IDs to musicbrainz release groups so they can be merged into later requests
export let drm = new Map<string, string>();

function fakeId(id: any, type: string) {
  // artist
  let p = "a";

  if (type === "album") {
    p = "b";
  }
  if (type === "track") {
    p = "c";
  }
  if (type === "release") {
    p = "d";
  }
  if (type === "recording") {
    p = "e";
  }
  id = `${id}`;
  id = id.padStart(12, p);

  return `${"".padStart(8, p)}-${"".padStart(4, p)}-${"".padStart(
    4,
    p
  )}-${"".padStart(4, p)}-${id}`;
}

async function deemixArtists(name: string): Promise<[]> {
  const data = await fetch(
    `${deemixUrl}/search/artists?limit=100&offset=0&q=${name}`
  );
  const j = (await data.json()) as any;
  return j["data"] as [];
}

export async function deemixAlbum(id: string): Promise<any> {
  const data = await fetch(`${deemixUrl}/albums/${id}`);
  const j = (await data.json()) as any;
  return j;
}

export async function deemixTracks(id: string): Promise<any> {
  const data = await fetch(`${deemixUrl}/album/${id}/tracks`);
  const j = (await data.json()) as any;
  return j.data as [];
}

export async function deemixArtist(id: string): Promise<any> {
  const data = await fetch(`${deemixUrl}/artists/${id}`);
  const j = (await data.json()) as any;

  return {
    Albums: [
      ...j["albums"]["data"].map((a: any) => ({
        Id: fakeId(a["id"], "album"),
        OldIds: [],
        ReleaseStatuses: ["Official"],
        SecondaryTypes: a["title"].toLowerCase().includes("live")
          ? ["Live"]
          : [],
        Title: a["title"],
        Type: getType(a["record_type"]),
      })),
    ],
    artistaliases: [],
    artistname: j["name"],
    disambiguation: "",

    genres: [],
    id: `${fakeId(j["id"], "artist")}`,
    images: [{ CoverType: "Poster", Url: j["picture_xl"] }],
    links: [
      {
        target: j["link"],
        type: "deezer",
      },
    ],
    oldids: [],
    overview: "!!--Imported from Deemix--!!",
    rating: { Count: 0, Value: null },
    sortname: (j["name"] as string).split(" ").reverse().join(", "),
    status: "active",
    type: "Artist",
  };
}

async function deemixAlbums(name: string): Promise<any[]> {
  let total = 0;
  let start = 0;
  const data = await fetch(
    `${deemixUrl}/search/albums?limit=1&offset=0&q=${name}`
  );

  const j = (await data.json()) as any;
  total = j["total"] as number;

  const albums: any[] = [];
  while (start < total) {
    const data = await fetch(
      `${deemixUrl}/search/albums?limit=100&offset=${start}&q=${name}`
    );
    const j = (await data.json()) as any;
    albums.push(...(j["data"] as []));
    start += 100;
  }

  return albums.filter(
    (a) =>
      normalize(a["artist"]["name"]) === normalize(name) ||
      a["artist"]["name"] === "Verschillende artiesten"
  );
}

function getType(rc: string) {
  let type = rc.charAt(0).toUpperCase() + rc.slice(1);

  if (type === "Ep") {
    type = "EP";
  }
  return type;
}

export async function getAlbum(id: string) {
  const d = await deemixAlbum(id);
  const contributors = d["contributors"].map((c: any) => ({
    id: fakeId(c["id"], "artist"),
    artistaliases: [],
    artistname: c["name"],
    disambiguation: "",
    overview: "!!--Imported from Deemix--!!",
    genres: [],
    images: [],
    links: [],
    oldids: [],
    sortname: (c["name"] as string).split(" ").reverse().join(", "),
    status: "active",
    type: "Artist",
  }));

  const lidarrArtists = await getAllLidarrArtists();

  let lidarr = null;
  let deemix = null;

  for (let la of lidarrArtists) {
    for (let c of contributors) {
      if (
        la["artistName"] === c["artistname"] ||
        normalize(la["artistName"]) === normalize(c["artistname"])
      ) {
        lidarr = la;
        deemix = c;
      }
    }
  }

  let lidarr2: any = {};

  lidarr2 = {
    id: lidarr!["foreignArtistId"],
    artistname: lidarr!["artistName"],
    artistaliases: [],
    disambiguation: "",
    overview: "",
    genres: [],
    images: [],
    links: [],
    oldids: [],
    sortname: lidarr!["artistName"].split(" ").reverse().join(", "),
    status: "active",
    type: "Arist",
  };

  const tracks = await deemixTracks(d["id"]);
  return {
    aliases: [],
    artistid: lidarr2["id"],
    artists: [lidarr2],
    disambiguation: "",
    genres: [],
    id: `${fakeId(d["id"], "album")}`,
    images: [{ CoverType: "Cover", Url: d["cover_xl"] }],
    links: [],
    oldids: [],
    overview: "!!--Imported from Deemix--!!",
    rating: { Count: 0, Value: null },
    releasedate: d["release_date"],
    releases: [
      {
        country: ["Worldwide"],
        disambiguation: "Deezer",
        id: `${fakeId(d["id"], "release")}`,
        label: [d["label"]],

        media: _.uniqBy(tracks, "disk_number").map((t: any) => ({
          Format: "Digital Media",
          Name: "",
          Position: t["disk_number"],
        })),
        oldids: [],
        releasedate: d["release_date"],
        status: "Official",
        title: d["title"],
        track_count: d["nb_tracks"],
        tracks: tracks.map((t: any, idx: number) => ({
          artistid: lidarr2["id"],
          durationms: t["duration"] * 1000,
          id: `${fakeId(t["id"], "track")}`,
          mediumnumber: t["disk_number"],
          oldids: [],
          oldrecordingids: [],
          recordingid: fakeId(t["id"], "recording"),
          trackname: t["title"],
          tracknumber: `${idx + 1}`,
          trackposition: idx + 1,
        })),
      },
    ],
    secondarytypes: d["title"].toLowerCase().includes("live") ? ["Live"] : [],
    title: d["title"],
    type: getType(d["record_type"]),
  };
}

export async function getAlbums(name: string) {
  const dalbums = await deemixAlbums(name);

  let dtoRalbums = dalbums.map((d) => ({
    Id: `${fakeId(d["id"], "album")}`,
    OldIds: [],
    ReleaseStatuses: ["Official"],
    SecondaryTypes: d["title"].toLowerCase().includes("live") ? ["Live"] : [],
    Title: d["title"],
    LowerTitle: d["title"].toLowerCase(),
    Type: getType(d["record_type"]),
  }));

  dtoRalbums = _.uniqBy(dtoRalbums, "LowerTitle");

  return dtoRalbums;
}

export async function search(
  lidarr: any,
  query: string,
  isManual: boolean = true
) {
  const dartists = await deemixArtists(query);

  let lartist;
  let lidx = -1;
  let didx = -1;
  
  for (const [i, artist] of lidarr.entries()) {
    if (artist["album"] === null) {
      lartist = artist;
      lidx = i;
      break;
    }
  }

  if (lartist) {
    let dartist;
    for (const [i, d] of dartists.entries()) {
      if (
        lartist["artist"]["artistname"] === d["name"] ||
        normalize(lartist["artist"]["artistname"]) === normalize(d["name"])
      ) {
        dartist = d;
        didx = i;
        break;
      }
    }
    if (dartist) {
      let posterFound = false;
      for (const img of lartist["artist"]["images"] as any[]) {
        if (img["CoverType"] === "Poster") {
          posterFound = true;
          break;
        }
      }
      if (!posterFound) {
        (lartist["artist"]["images"] as any[]).push({
          CoverType: "Poster",
          Url: dartist["picture_xl"],
        });
      }
      lartist["artist"]["oldids"].push(fakeId(dartist["id"], "artist"));
    }

    lidarr[lidx] = lartist;
  }

  if (didx > -1) {
    dartists.splice(didx, 1);
  }

  let dtolartists: any[] = dartists.map((d) => ({
    artist: {
      artistaliases: [],
      artistname: d["name"],
      sortname: (d["name"] as string).split(" ").reverse().join(", "),
      genres: [],
      id: `${fakeId(d["id"], "artist")}`,
      images: [
        {
          CoverType: "Poster",
          Url: d["picture_xl"],
        },
      ],
      links: [
        {
          target: d["link"],
          type: "deezer",
        },
      ],
      type:
        (d["type"] as string).charAt(0).toUpperCase() +
        (d["type"] as string).slice(1),
    },
  }));

  if (lidarr.length === 0) {
    const sorted = [];

    for (const a of dtolartists) {
      if (
        a.artist.artistname === decodeURIComponent(query) ||
        normalize(a.artist.artistname) === normalize(decodeURIComponent(query))
      ) {
        sorted.unshift(a);
      } else {
        sorted.push(a);
      }
    }
    dtolartists = sorted;
  }

  if (!isManual) {
    dtolartists = dtolartists.map((a) => a.artist);
  }

  lidarr = [...lidarr, ...dtolartists];

  return lidarr;
}

async function getAritstByName(name: string) {
  const artists = await deemixArtists(name);
  const artist = artists.find(
    (a) => a["name"] === name || normalize(a["name"]) === normalize(name)
  );
  return artist;
}

export async function getArtist(lidarr: any) {
  if (lidarr["error"]) return lidarr;
  const artist = await getAritstByName(lidarr["artistname"]);
  if (typeof artist === "undefined") {
    return lidarr;
  }
  let posterFound = false;
  for (const img of lidarr["images"] as any[]) {
    if (img["CoverType"] === "Poster") {
      posterFound = true;
      break;
    }
  }
  if (!posterFound) {
    (lidarr["images"] as any[]).push({
      CoverType: "Poster",
      Url: artist!["picture_xl"],
    });
  }

  const albums = await getAlbums(lidarr["artistname"]);

  let existing = lidarr["Albums"].map((a: any) => normalize(a["Title"]));
  
  // Match release groups with the same name, and store the IDs so that the releases can be merged when the album info is requested
  for (let lalbum of lidarr["Albums"]) {
    for (let dalbum of albums) {
		if (normalize(lalbum["Title"]) === normalize(dalbum["Title"])) {
			console.log(`Matched release ${lalbum["Title"]}`);
			drm.set(lalbum["Id"], dalbum["Id"]);
			
			// Make sure that Official is included as a release status as we will be adding an official release later
			if (process.env.MERGE_RELEASES === "true" && !lalbum["ReleaseStatuses"].includes("Official")) {
				lalbum["ReleaseStatuses"].push("Official");
			}
		}
	}
    
  }
  
  // Add albums that are only on Deezer
  lidarr["Albums"] = [
    ...lidarr["Albums"],
    ...albums.filter((a) => !existing.includes(normalize(a["Title"]))),
  ];
  
  return lidarr;
}

//
