import latinize from "latinize";

export function normalize(str: string) {
  return latinize(str.toLowerCase()).replace("'", "’");
}

export function removeKeys(obj: any, keys: any) {
  var index;
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      switch (typeof obj[prop]) {
        case "string":
          index = keys.indexOf(prop);
          if (index > -1) {
            delete obj[prop];
          }
          break;
        case "object":
          index = keys.indexOf(prop);
          if (index > -1) {
            delete obj[prop];
          } else {
            removeKeys(obj[prop], keys);
          }
          break;
      }
    }
  }
  return obj;
}

export function checkSecondaryTypes(albuminfo: any) {
	let secondaryTypes = ["Live"];
	
	for (let track of albuminfo["tracks"]["data"]) {
		if (track["title_version"] !== "(Live)") {
			secondaryTypes = [];
			break;
		}
	}
	
	return secondaryTypes;
}
