const SHARED_LOCATIONS = [
    { name: "Hospital", types: ["Hospital"], group: "Services" },
    { name: "The Slums", types: ["Slums"], group: "Services" },
    { name: "Travel Agency", types: ["Travel Agency"], group: "Services" },
    { name: "World Stock Exchange", types: ["Stock Market"], group: "Services" },
];

// The Void is an internal special destination rather than a normal city-map location.

const CITY_LOCATION_CATALOG = {
    "Aevum": [
        { name: "AeroCorp", types: ["Company"], group: "Companies" },
        { name: "Bachman & Associates", types: ["Company"], group: "Companies" },
        { name: "Clarke Incorporated", types: ["Company"], group: "Companies" },
        { name: "Crush Fitness Gym", types: ["Gym"], group: "Training", server: "crush-fitness" },
        { name: "ECorp", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Fulcrum Technologies", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Galactic Cybersystems", types: ["Company"], group: "Companies" },
        { name: "NetLink Technologies", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Aevum Police Headquarters", types: ["Company"], group: "Companies" },
        { name: "Rho Construction", types: ["Company"], group: "Companies" },
        { name: "Snap Fitness Gym", types: ["Gym"], group: "Training", server: "snap-fitness" },
        { name: "Summit University", types: ["University"], group: "Training" },
        { name: "Watchdog Security", types: ["Company"], group: "Companies" },
        { name: "Iker Molina Casino", types: ["Casino"], group: "Special" },
    ],
    "Chongqing": [
        { name: "KuaiGong International", types: ["Company"], group: "Companies" },
        { name: "Solaris Space Systems", types: ["Company"], group: "Companies" },
        { name: "Church of the Machine God", types: ["Special"], group: "Special" },
        { name: "Shadowed Walkway", types: ["Special"], group: "Special" },
    ],
    "Ishima": [
        { name: "Nova Medical", types: ["Company"], group: "Companies" },
        { name: "Omega Software", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Storm Technologies", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "0x6C1", types: ["Special"], group: "Special" },
    ],
    "New Tokyo": [
        { name: "DefComm", types: ["Company", "Special"], group: "Companies" },
        { name: "Global Pharmaceuticals", types: ["Company"], group: "Companies" },
        { name: "Noodle Bar", types: ["Company", "Special"], group: "Companies" },
        { name: "VitaLife", types: ["Company", "Special"], group: "Companies" },
        { name: "Arcade", types: ["Special"], group: "Special" },
    ],
    "Sector-12": [
        { name: "Alpha Enterprises", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Blade Industries", types: ["Company"], group: "Companies" },
        { name: "Central Intelligence Agency", types: ["Company", "Special"], group: "Companies" },
        { name: "Carmichael Security", types: ["Company"], group: "Companies" },
        { name: "Sector-12 City Hall", types: ["Special"], group: "Special" },
        { name: "DeltaOne", types: ["Company"], group: "Companies" },
        { name: "FoodNStuff", types: ["Company"], group: "Companies" },
        { name: "Four Sigma", types: ["Company"], group: "Companies" },
        { name: "Icarus Microsystems", types: ["Company"], group: "Companies" },
        { name: "Iron Gym", types: ["Gym"], group: "Training", server: "iron-gym" },
        { name: "Joe's Guns", types: ["Company"], group: "Companies" },
        { name: "MegaCorp", types: ["Company"], group: "Companies" },
        { name: "National Security Agency", types: ["Company", "Special"], group: "Companies" },
        { name: "Powerhouse Gym", types: ["Gym"], group: "Training", server: "powerhouse-fitness" },
        { name: "Rothman University", types: ["University"], group: "Training" },
        { name: "Universal Energy", types: ["Company"], group: "Companies" },
    ],
    "Volhaven": [
        { name: "CompuTek", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Helios Labs", types: ["Company"], group: "Companies" },
        { name: "LexoCorp", types: ["Company"], group: "Companies" },
        { name: "Millenium Fitness Gym", types: ["Gym"], group: "Training", server: "millenium-fitness" },
        { name: "NWO", types: ["Company"], group: "Companies" },
        { name: "OmniTek Incorporated", types: ["Company", "Tech Vendor"], group: "Companies" },
        { name: "Omnia Cybersystems", types: ["Company"], group: "Companies" },
        { name: "SysCore Securities", types: ["Company"], group: "Companies" },
        { name: "ZB Institute of Technology", types: ["University"], group: "Training" },
    ],
};

export const CITY_NAMES = Object.freeze(["Aevum", "Chongqing", "Ishima", "New Tokyo", "Sector-12", "Volhaven"]);

export function getCityLocations(city) {
    const locations = CITY_LOCATION_CATALOG[city];
    if (!Array.isArray(locations)) return [];
    return [...locations, ...SHARED_LOCATIONS].map((location) => ({ ...location, types: [...location.types] }));
}

export function getLocationCatalogEntry(city, locationName) {
    return getCityLocations(city).find((location) => location.name === locationName) ?? null;
}
