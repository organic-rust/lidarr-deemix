import { normalize } from "./helpers.js";

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

