import { normalize } from "./helpers.js";

let tagnames: string[] = []; // Maps lidarr tag IDs to names

// export async function getLidarArtist(name: string) {
  // let path = "/api/v0.4/search?type=all&query=${name}";
  // if (process.env.SELF_HOSTED_METADATA === "true") {
    // path = path.slice(9);
  // }
  // const res = await fetch(
    // `${process.env.LIDARR_METADATA_SERVER}${path}`
  // );
  // const json = (await res.json()) as [];
  // const a = json.find(
    // (a) =>
      // a["album"] === null &&
      // typeof a["artist"] !== "undefined" &&
      // normalize(a["artist"]["artistname"]) === normalize(name)
  // );
  // if (typeof a !== "undefined") {
    // return a["artist"];
  // }
  // return null;
// }

export async function getAllLidarrArtists() {
  const res = await fetch(`${process.env.LIDARR_URL}/api/v1/artist`, {
    headers: { "X-Api-Key": process.env.LIDARR_API_KEY as string },
  });
  const json = (await res.json()) as [];
  return json;
}

export async function getLidarrArtist(id: string) {
  const res = await fetch(`${process.env.LIDARR_URL}/api/v1/artist/${id}`, {
    headers: { "X-Api-Key": process.env.LIDARR_API_KEY as string },
  });
  
  const json = (await res.json()) as [];
  return json;
}

async function getLidarrTags() {
	const res = await fetch(`${process.env.LIDARR_URL}/api/v1/tag`, {
		headers: { "X-Api-Key": process.env.LIDARR_API_KEY as string },
	});
	
	const json = (await res.json()) as [];
	
	for (let tag of json) {
		tagnames[tag["id"]] = tag["label"];
	}
	
	return
}

export async function getLidarrArtistTags(mbid: string) {
	let artists: any[] = await getAllLidarrArtists();
	await getLidarrTags();
	
	let artist = artists.find(item => item["foreignArtistId"] === mbid)
	var tags = new Array();
	
	if (artist === undefined) {
		/*
			Artist is currently being added to lidarr, so not in database yet.
			Return mb_only to prevent excessive deemix requests being made on initial add when they may be unwanted.
			Lidarr always requests /artist twice, and if the artist was not tagged mb_only during add, the deemix results will be included on the second request.
			I have no idea why this happens but it seems to work
		*/
		return ["mb_only"];
	}
	
	for (let tag of artist["tags"]) {
		tags.push(tagnames[tag]);
	}
	
	return tags;
}
