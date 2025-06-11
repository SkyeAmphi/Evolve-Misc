(async () => {
function synchronize() {
    const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

    return new Promise(resolve => {
        function impl() {
            if (win.evolve?.global?.stats !== undefined) {
                resolve(win.evolve);
            }
            else {
                setTimeout(impl, 100);
            }
        }

        impl();
    });
}

const evolve = await synchronize();

async function waitEvolved() {
    return new Promise(resolve => {
        if (evolve.global.race.species !== "protoplasm") {
            resolve();
        }
        else {
            const id = setInterval(() => {
                if (evolve.global.race.species !== "protoplasm") {
                    clearInterval(id);
                    resolve();
                }
            }, 100)
        }
    })
}

await waitEvolved();

/*------------------------------------------------------------------------------------------------*/

const regionOverrides = {
    "arpa": "A.R.P.A.",
    "city": "City",
    "starDock": "Star Dock",
    "spc_home": "Earth's Orbit",
    "spc_moon": "Moon",
    "spc_red": "Red Planet",
    "spc_hell": "Hell Planet",
    "spc_sun": "Sun",
    "spc_gas": "Gas Giant",
    "spc_gas_moon": "Gas Giant's Moon",
    "spc_belt": "Asteroid Belt",
    "spc_dwarf": "Dwarf Planet",
    "gxy_alien1": "Alien 1 System",
    "gxy_alien2": "Alien 2 System",
    "tau_home": "Tau Ceti New Home",
    "tau_red": "Tau Ceti Red Planet",
    "tau_gas": "Tau Ceti Gas Giant",
    "tau_gas2": "Tau Ceti Gas Giant 2",
    "tau_roid": "Tau Ceti Asteroid Belt",
};

const nameOverrides = {
    "arpa-monument": "Monument",
    "city-wonder_lighthouse": "Lighthouse",
    "city-wonder_pyramid": "Pyramid",
    "space-wonder_statue": "Colossus",
    "interstellar-wonder_gardens": "Hanging Gardens",
    "eden-rushmore": "Mount Rushmore",
};

const prefixes = {
    "space": "Space",
    "galaxy": "Galaxy",
    "eden": "Eden",
    "tauceti": "Tau Ceti"
};

const prefixOverrides = {
    "space-g_factory": undefined,
    "space-spaceport": undefined,
    "space-titan_quarters": undefined,
    "space-titan_mine": "Titan",
    "space-titan_spaceport": "Titan",
    "interstellar-g_factory": undefined,
    "interstellar-habitat": undefined,
    "interstellar-laboratory": undefined,
    "interstellar-warehouse": "Space",
    "tauceti-womling_lab": undefined
};

const suffixes = {
    "space-m_relay": "Complete",
    "space-world_controller": "Complete",
    "space-atmo_terraformer": "Complete",
    "space-ai_core2": "Complete",
    "interstellar-s_gate": "Complete",
    "interstellar-ascension_trigger": "Complete",
    "portal-oven_complete": "Complete",
    "eden-rune_gate_open": "Complete",
    "tauceti-alien_space_station": "Complete",
    "tauceti-alien_station_survey": "Survey",
    "interstellar-dyson_sphere": "Bolognium",
    "interstellar-elysanite_sphere": "Elysanite",
    "interstellar-orichalcum_sphere": "Orichalcum",
};

const techSuffixes = {
    alt_anthropology: "Post-Transcendence",
    alt_fanaticism: "Post-Transcendence",
    study_alt: "Post-Preeminence",
    deify_alt: "Post-Preeminence",

    wind_plant: "Power Plant",
    dyson_sphere: "Plans",
    unification: "Plans",
    exotic_infusion: "1st Warning",
    infusion_check: "2nd Warning",
    protocol66: "Warning",

    bone_tools: "Evil",
    lodge: "Carnivore"
};

function getName(obj) {
    if ("title" in obj) {
        return obj.title instanceof Function ? obj.title() : obj.title;
    }
    else if ("name" in obj) {
        return obj.name instanceof Function ? obj.name() : obj.name;
    }
}

function getTechName(id, tech) {
    const name = getName(tech);
    if (name === undefined) {
        console.error(id);
        return;
    }

    const entry = { name };

    const suffixes = [];

    if ("trait" in tech) {
        const trait = tech.trait[0];
        if (trait in evolve.traits) {
            suffixes.push(evolve.loc(`trait_${trait}_name`));
        }
        else {
            suffixes.push(evolve.loc(`evo_challenge_${trait}`));
        }
    }

    if (id in techSuffixes) {
        suffixes.push(techSuffixes[id]);
    }

    if (tech.category === "fasting" && !suffixes.includes("Fasting")) {
        suffixes.push("Fasting");
    }

    if (("roguemagic" in tech.reqs || tech.grant?.contains?.("roguemagic")) && !suffixes.includes("Witch Hunter")) {
        suffixes.push("Witch Hunter");
    }

    if ((tech.path && tech.path.length === 1 && tech.path.includes("truepath")) || id === "iso_gambling") {
        suffixes.push("True Path");
    }

    if (suffixes.length !== 0) {
        entry.suffix = suffixes.join(", ")
    }

    return entry;
}

function* getBuildingNames(tabID, region) {
    for (const [id, building] of Object.entries(region)) {
        if (id === "info") {
            continue;
        }

        if (id === "horseshoe") {
            continue;
        }

        if ("touchlabel" in building) {
            continue;
        }

        const fullID = `${tabID}-${id}`;

        const name = nameOverrides[fullID] ?? getName(building);

        if (name !== undefined) {
            const entry = { name };

            if (fullID in suffixes) {
                entry.suffix = suffixes[fullID];
            }

            if ("trait" in building) {
                if (building.trait.includes("cataclysm")) {
                    entry.suffix ??= "Cataclysm";
                }
                if (building.trait.includes("orbit_decayed")) {
                    entry.suffix ??= "Orbital Decay";
                }
            }

            if (fullID in prefixOverrides) {
                entry.prefix = prefixOverrides[fullID];
            }

            yield [id, entry];
        }
        else {
            console.error(fullID);
        }
    }
}

function transform(fn) {
    return (obj) => Object.fromEntries(Object.entries(obj).map(fn));
}

function filter(fn) {
    return (obj) => Object.fromEntries(Object.entries(obj).filter(fn));
}

function chain(obj, transforms) {
    for (const f of transforms) {
        obj = f(obj);
    }
    return obj;
}

function applyOverrides(prototype, overrides) {
    const replaced = {};

    for (let [k, v] of Object.entries(overrides)) {
        let force = false;
        if (typeof v === "object" && "$force" in v) {
            force = v.$force;
            v = v.$value;
        }

        if (!(k in prototype) && !force) {
            continue;
        }

        if (typeof prototype[k] === "object" && typeof v === "object") {
            replaced[k] = applyOverrides(prototype[k], v);
        }
        else if (prototype[k] !== v) {
            replaced[k] = prototype[k];
            prototype[k] = v;
        }
    }

    return replaced;
}

const overrides = {
    settings: {
        boring: true
    },
    race: {
        ...Object.fromEntries(Object.keys(evolve.traits).map(id => [id, 0])),
        universe: "standard",
        species: "human",
        governor: {
            g: {
                bg: "bureaucrat"
            }
        },
        orbit_decayed: undefined,
        cataclysm: undefined
    },
    tech: {
        ...Object.fromEntries(Object.keys(evolve.global.tech).map(id => [id, 0])),
        storage: { $value: 4, $force: true },
        edenic: { $value: 3, $force: true }
    },
    resources: chain(evolve.global.resource, [
        filter(([id]) => !["Money", "protoplasm", evolve.global.race.species].includes(id)),
        transform(([id, info]) => [id, { ...info, name: evolve.loc(`resource_${id}_name`) }])
    ])
};

function getVueBinding(selector) {
    return $(selector)[0].__vue__
}

function withOverrides(overrides, fn) {
    const bindings = {
        settings: getVueBinding("#mainColumn div:first-child").s,
        resources: getVueBinding("#statsPanel").r,
        race: getVueBinding("#statsPanel").g,
        tech: getVueBinding("#galaxyTrade").t
    };

    const original = applyOverrides(bindings, overrides);

    try {
        return fn();
    }
    finally {
        applyOverrides(bindings, original);
    }
}

const [buildings, techs] = withOverrides(overrides, () => {
    const buildings = {};
    const techs = {};

    const otherTabs = new Set(["blood", "evolution", "genes", "tech"]);

    for (const [tabID, tab] of Object.entries(evolve.actions)) {
        if (otherTabs.has(tabID)) {
            continue;
        }

        buildings[tabID] = {};

        if (tabID in regionOverrides) {
            const region = regionOverrides[tabID];
            buildings[tabID][region] = Object.fromEntries(getBuildingNames(tabID, tab));
        }
        else {
            for (const [subtabID, subtab] of Object.entries(tab)) {
                const region = regionOverrides[subtabID] ??= getName(subtab.info);
                buildings[tabID][region] = Object.fromEntries(getBuildingNames(tabID, subtab));
            }
        }
    }

    for (const [id, tech] of Object.entries(evolve.actions.tech)) {
        const name = getTechName(id, tech);
        if (name === undefined) {
            continue;
        }

        const era = evolve.loc(`tech_era_${tech.era}`);

        (techs[era] ??= {})[id] = name;
    }

    return [buildings, techs];
});

function* iterate(buildings) {
    for (const [tab, regions] of Object.entries(buildings)) {
        for (const [region, entries] of Object.entries(regions)) {
            for (const [buildingID, entry] of Object.entries(entries)) {
                const id = `${tab}-${buildingID}`;
                yield { id, tab, region, buildingID, entry };
            }
        }
    }
}

function getDuplicates(buildings, raw) {
    const duplicates = {};

    for (const { region, id, entry } of iterate(buildings)) {
        let fullName = entry.name;
        if (!raw) {
            if (entry.prefix) {
                fullName = `${entry.prefix} ${fullName}`;
            }
            if (entry.suffix) {
                fullName = `${fullName} (${entry.suffix})`;
            }
        }

        (duplicates[fullName] ??= {})[id] = region;
    }

    return filter(([, v]) => Object.entries(v).length > 1)(duplicates);
}

let duplicates = getDuplicates(buildings, true);
console.log("before", duplicates);

for (const { id, tab, entry } of iterate(buildings)) {
    if (entry.name in duplicates && id in duplicates[entry.name]) {
        if (!("prefix" in entry) && tab in prefixes) {
            entry.prefix = prefixes[tab];
        }
    }
}

duplicates = getDuplicates(buildings, false);
console.log("after", duplicates);

const custom = {};
for (const { id, entry: { name, prefix, suffix } } of iterate(buildings)) {
    let fullName = name;

    if (prefix || suffix) {
        if (prefix) {
            fullName = `${prefix} ${fullName}`;
        }

        if (suffix) {
            fullName = `${fullName} (${suffix})`;
        }

        custom[id] = fullName;
    }
}
console.log("overrides", custom);

for (const { tab, region, buildingID, entry } of iterate(buildings)) {
    if (!entry.prefix && !entry.suffix) {
        buildings[tab][region][buildingID] = entry.name;
    }
}

console.log(buildings);

let duplicateTechs = {};
for (const group of Object.values(techs)) {
    for (const [id, { name, suffix }] of Object.entries(group)) {
        (duplicateTechs[`${name} (${suffix})`] ??= []).push(id);
    }
}
duplicateTechs = filter(([, v]) => Object.entries(v).length > 1)(duplicateTechs);

for (const group of Object.values(techs)) {
    for (const [id, { name, suffix }] of Object.entries(group)) {
        if (!suffix) {
            group[id] = name;
        }
    }
}

console.log(duplicateTechs);

console.log(techs);

})();
