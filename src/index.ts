import * as flags_usage from "flags_usage";
import * as common from "../v2ray/app/router/routercommon/common.ts";

const options = {
  argument: {
    "exclude-ads": "bool",
    "exclude-not-cn": "bool",
    "prefix": "string",
    "suffix": "string",
  },
  default: {
    "exclude-ads": false,
    "exclude-dot-cn": true,
    "exclude-not-cn": false,
    "prefix": "",
    "suffix": "",
  },
  boolean: ["exclude-ads", "exclude-dot-cn", "exclude-not-cn"],
  string: ["prefix", "suffix"],
};

const flags = flags_usage.processFlags(Deno.args, options);

const filter = Function(
  "domain",
  `if (false
    ${flags["exclude-dot-cn"] ? '|| domain.value.endsWith(".cn")' : ""}
    ${
    flags["exclude-ads"]
      ? '|| domain.attribute.find((i) => i.key === "ads") !== undefined'
      : ""
  }
    ${
    flags["exclude-not-cn"]
      ? '|| domain.attribute.find((i) => i.key === "!cn") !== undefined'
      : ""
  }
    ) {
    return false
} else {
    return true
}`,
);

if (typeof flags._[0] === "string" && typeof flags._[1] === "string") {
  const geositelist = common.GeoSiteList.decode(Deno.readFileSync(flags._[0]));

  const file = Deno.createSync(flags._[1]);
  const textEncoder = new TextEncoder();

  const geosite = geositelist.entry.find((i) =>
    i.countryCode == "GEOLOCATION-CN"
  );

  if (geosite !== undefined) {
    if (flags["exclude-dot-cn"]) {
      file.writeSync(
        textEncoder.encode(`${flags["prefix"]}cn${flags["suffix"]}\n`),
      );
    }

    for (const domain of geosite.domain) {
      if (domain.type >= 2 && filter(domain)) {
        file.writeSync(
          textEncoder.encode(
            `${flags["prefix"]}${domain.value}${flags["suffix"]}\n`,
          ),
        );
      }
    }
  }
} else {
  flags_usage.logUsage(options);
  Deno.exit(1);
}
