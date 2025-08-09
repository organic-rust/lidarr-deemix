import _ from "lodash";
const deemixUrl = "http://127.0.0.1:7272";
import { getAllLidarrArtists, getLidarrArtist, getLidarrArtistTags } from "./lidarr.js";
import { normalize, checkSecondaryTypes, sleep } from "./helpers.js";
import { link } from "fs";


export let drm = new Map<string, string>(); // Used to map deezer album IDs to musicbrainz release groups so they can be merged into later requests
let dac = new Map<string, any>; // Cache of album info requested ahead of time for live detection. May not be required if deemix has internal cache?


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
  let j;
  
  if (dac.has(id)) {
	console.log(`${id} is cached`);
    j = dac.get(id);
  } else {
	console.log(`${id} not cached - requesting`);
	const data = await fetch(`${deemixUrl}/albums/${id}`);
    j = (await data.json()) as any;
	dac.set(id, j);
  }
  
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
        SecondaryTypes: [],
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
  let d = await deemixAlbum(id);
  
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
    secondarytypes: checkSecondaryTypes(d),
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
    SecondaryTypes: ["None"], // Will be replaced later
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

function checkAlbumMatch(lalbum: any, dalbum: any) {
	let name_match = false;
	let type_match = false;
	
	//Check name match
	if (normalize(lalbum["Title"]) === normalize(dalbum["Title"])) {
		name_match = true;
	} else {
		// Clean names & re-match
		let l_clean = lalbum["Type"] === "EP" && lalbum["Title"].endsWith(" EP") ? lalbum["Title"].slice(0, -3) : lalbum["Title"];
		let d_clean = dalbum["Type"] === "EP" && dalbum["Title"].endsWith(" EP") ? dalbum["Title"].slice(0, -3) : dalbum["Title"];
		
		if (normalize(l_clean) === normalize(d_clean)) {
			name_match =  true;
		}
	}
	
	//Check type match
	if (lalbum["Type"] == dalbum["Type"]) {
		type_match = true;
	} else if ((lalbum["Type"] == "Album" || lalbum["Type"] == "EP") && (dalbum["Type"] == "Album" || dalbum["Type"] == "EP")) {
		type_match = true;
	}
	
	return name_match && type_match;
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
  
  // console.log(JSON.stringify(lidarr["Albums"]));
  // console.log(JSON.stringify(albums));
  
  // Match release groups with the same name, and store the IDs so that the releases can be merged when the album info is requested
  for (let lalbum of lidarr["Albums"]) {
    for (var i = 0; i < albums.length; i++) {
		let dalbum = albums[i];
		
		if (checkAlbumMatch(lalbum, dalbum)) {
			console.log(`Matched release ${lalbum["Title"]}`);
			drm.set(lalbum["Id"], dalbum["Id"]);
			
			// Make sure that Official is included as a release status as we will be adding an official release later
			if (process.env.MERGE_RELEASES === "true" && !lalbum["ReleaseStatuses"].includes("Official")) {
				lalbum["ReleaseStatuses"].push("Official");
			}
			
			// Remove from deezer album list and decrement index so items are not skipped
			albums.splice(i, 1);
			--i;
		}
	}
  }
	
	// Check artist tags in lidarr to see if we want deemix only results
	let tags = await getLidarrArtistTags(lidarr["id"]);
	if (tags.includes("mb_only")) {
		console.log(`${lidarr["artistname"]} is tagged with mb_only - excluding releases not on musicbrainz`);
		return lidarr;
	}
  
  // Request information for unmatched albums to check if they're live
  for (let album of albums) {
    let id = album["Id"].split("/").pop()?.split("-").pop()?.replaceAll("b", "");
    let a = await deemixAlbum(id!);
	album["SecondaryTypes"] = checkSecondaryTypes(a);
	await sleep(1000);
  }
  
  // Add items that were not matched earlier to album list
  lidarr["Albums"] = [
    ...lidarr["Albums"],
    ...albums,
  ];
  
  return lidarr;
}
