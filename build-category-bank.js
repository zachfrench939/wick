/* Builds questions-categories.js. Facts are stable general knowledge.
   Run: node build-category-bank.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var dir = __dirname;
var context = { window: {} };
vm.createContext(context);
["questions.js", "questions-extra.js", "questions-more.js"].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(dir, name), "utf8"), context, { filename: name });
});

var seen = Object.create(null);
(context.window.WICK_QUESTIONS || []).forEach(function (item) {
  if (item && item.q) seen[item.q] = true;
});

function hash(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  var copy = list.slice();
  for (var i = copy.length - 1; i > 0; i -= 1) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

var out = [];
var counts = {};

function add(slug, category, question, answer, wrongs) {
  if (!question || seen[question]) return;
  var choices = [answer].concat(wrongs || []);
  var uniq = {};
  for (var i = 0; i < choices.length; i += 1) {
    if (!choices[i] || uniq[choices[i]]) return;
    uniq[choices[i]] = true;
  }
  if (choices.length !== 4) return;
  if (choices.indexOf(answer) === -1) return;
  var ordered = shuffle(choices, mulberry32(hash(question)));
  seen[question] = true;
  counts[slug] = (counts[slug] || 0) + 1;
  out.push({
    category: category,
    slug: slug,
    q: question,
    answer: answer,
    choices: ordered
  });
}

function others(pool, answer, n, salt) {
  var list = [];
  var start = hash(String(salt) + "|" + answer) % pool.length;
  for (var i = 0; i < pool.length && list.length < n; i += 1) {
    var value = pool[(start + i) % pool.length];
    if (value !== answer && list.indexOf(value) === -1) list.push(value);
  }
  return list;
}

function who(slug, category, prompt, pairs) {
  var names = pairs.map(function (p) { return p[0]; });
  pairs.forEach(function (pair) {
    add(slug, category, prompt.replace("{thing}", pair[1]), pair[0], others(names, pair[0], 3, pair[1]));
  });
}

function what(slug, category, prompt, pairs) {
  var things = pairs.map(function (p) { return p[1]; });
  pairs.forEach(function (pair) {
    add(slug, category, prompt.replace("{name}", pair[0]), pair[1], others(things, pair[1], 3, pair[0]));
  });
}

function yearQ(slug, category, label, year, salt) {
  var y = Number(year);
  add(slug, category, label, String(y), [String(y - 7), String(y + 5), String(y + 12)]);
}

/* ---------- Space ---------- */
var constellations = [
  ["Orion", "the hunter"], ["Ursa Major", "the great bear"], ["Ursa Minor", "the little bear"],
  ["Canis Major", "the great dog"], ["Canis Minor", "the little dog"], ["Leo", "the lion"],
  ["Taurus", "the bull"], ["Aries", "the ram"], ["Gemini", "the twins"], ["Cancer", "the crab"],
  ["Virgo", "the maiden"], ["Libra", "the scales"], ["Scorpius", "the scorpion"],
  ["Sagittarius", "the archer"], ["Capricornus", "the sea-goat"], ["Aquarius", "the water-bearer"],
  ["Pisces", "the fishes"], ["Cygnus", "the swan"], ["Aquila", "the eagle"], ["Lyra", "the lyre"],
  ["Draco", "the dragon"], ["Pegasus", "the winged horse"], ["Andromeda", "the princess"],
  ["Perseus", "the hero"], ["Cassiopeia", "the queen"], ["Cepheus", "the king"],
  ["Hercules", "the strong man"], ["Hydra", "the water snake"], ["Crux", "the southern cross"],
  ["Centaurus", "the centaur"], ["Lupus", "the wolf"], ["Corona Borealis", "the northern crown"],
  ["Lepus", "the hare"], ["Boötes", "the herdsman"], ["Auriga", "the charioteer"],
  ["Ophiuchus", "the serpent-bearer"], ["Delphinus", "the dolphin"], ["Leo Minor", "the little lion"],
  ["Monoceros", "the unicorn"], ["Vulpecula", "the fox"], ["Sagitta", "the arrow"],
  ["Lacerta", "the lizard"], ["Lynx", "the lynx"], ["Pavo", "the peacock"],
  ["Tucana", "the toucan"], ["Grus", "the crane"], ["Phoenix", "the phoenix"],
  ["Dorado", "the dolphinfish"], ["Carina", "the keel"], ["Vela", "the sails"],
  ["Puppis", "the stern"], ["Pyxis", "the compass"], ["Eridanus", "the river"],
  ["Cetus", "the sea monster"], ["Columba", "the dove"], ["Serpens", "the serpent"],
  ["Scutum", "the shield"], ["Equuleus", "the little horse"], ["Corvus", "the crow"],
  ["Crater", "the cup"], ["Coma Berenices", "Berenice's hair"], ["Canes Venatici", "the hunting dogs"],
  ["Triangulum", "the triangle"], ["Norma", "the set square"], ["Ara", "the altar"],
  ["Indus", "the Indian"], ["Octans", "the octant"], ["Apus", "the bird of paradise"],
  ["Musca", "the fly"], ["Chamaeleon", "the chameleon"], ["Volans", "the flying fish"],
  ["Fornax", "the furnace"], ["Horologium", "the clock"], ["Reticulum", "the net"],
  ["Pictor", "the painter's easel"], ["Caelum", "the chisel"], ["Antlia", "the air pump"],
  ["Microscopium", "the microscope"], ["Telescopium", "the telescope"], ["Sculptor", "the sculptor"],
  ["Piscis Austrinus", "the southern fish"], ["Corona Australis", "the southern crown"],
  ["Triangulum Australe", "the southern triangle"], ["Circinus", "the drawing compass"],
  ["Mensa", "the table mountain"], ["Hydrus", "the little water snake"], ["Camelopardalis", "the giraffe"],
  ["Sextans", "the sextant"]
];
var meanings = constellations.map(function (c) { return c[1]; });
constellations.forEach(function (c) {
  add("space", "Space", "The constellation " + c[0] + " is traditionally pictured as which of these?", c[1], others(meanings, c[1], 3, c[0]));
});

var stars = [
  ["Sirius", "Canis Major"], ["Polaris", "Ursa Minor"], ["Betelgeuse", "Orion"], ["Rigel", "Orion"],
  ["Vega", "Lyra"], ["Altair", "Aquila"], ["Deneb", "Cygnus"], ["Antares", "Scorpius"],
  ["Procyon", "Canis Minor"], ["Arcturus", "Boötes"], ["Capella", "Auriga"], ["Aldebaran", "Taurus"],
  ["Spica", "Virgo"], ["Regulus", "Leo"], ["Canopus", "Carina"], ["Pollux", "Gemini"],
  ["Castor", "Gemini"], ["Bellatrix", "Orion"], ["Alnilam", "Orion"], ["Fomalhaut", "Piscis Austrinus"]
];
var starNames = stars.map(function (s) { return s[0]; });
var starCons = stars.map(function (s) { return s[1]; });
stars.forEach(function (s) {
  add("space", "Space", "The star " + s[0] + " is in which constellation?", s[1], others(starCons, s[1], 3, s[0]));
});

var moons = [
  ["the Moon", "Earth"], ["Phobos", "Mars"], ["Deimos", "Mars"], ["Io", "Jupiter"],
  ["Europa", "Jupiter"], ["Ganymede", "Jupiter"], ["Callisto", "Jupiter"], ["Titan", "Saturn"],
  ["Enceladus", "Saturn"], ["Mimas", "Saturn"], ["Rhea", "Saturn"], ["Dione", "Saturn"],
  ["Tethys", "Saturn"], ["Iapetus", "Saturn"], ["Titania", "Uranus"], ["Oberon", "Uranus"],
  ["Miranda", "Uranus"], ["Ariel", "Uranus"], ["Umbriel", "Uranus"], ["Triton", "Neptune"],
  ["Charon", "Pluto"]
];
var moonNames = moons.map(function (m) { return m[0]; });
var moonHosts = ["Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
moons.forEach(function (m) {
  add("space", "Space", m[0] + " orbits which body?", m[1], others(moonHosts, m[1], 3, m[0]));
});

var planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
planets.forEach(function (name, index) {
  var place = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][index];
  add("space", "Space", "Which planet is " + place + " from the Sun?", name, others(planets, name, 3, place));
});
[
  ["Mercury", "the smallest of the eight planets"],
  ["Venus", "the hottest surface of the eight planets"],
  ["Earth", "known oceans of liquid water"],
  ["Mars", "the nickname the Red Planet"],
  ["Jupiter", "the largest planet in the solar system"],
  ["Saturn", "the most famous ring system"],
  ["Uranus", "a spin tipped on its side"],
  ["Neptune", "the eighth and furthest planet from the Sun"]
].forEach(function (pair) {
  var traits = ["the smallest of the eight planets", "the hottest surface of the eight planets", "known oceans of liquid water", "the nickname the Red Planet", "the largest planet in the solar system", "the most famous ring system", "a spin tipped on its side", "the eighth and furthest planet from the Sun"];
  add("space", "Space", "Which phrase best fits " + pair[0] + "?", pair[1], others(traits, pair[1], 3, pair[0]));
});
[
  ["Mercury", "88 Earth days"], ["Venus", "225 Earth days"], ["Earth", "365 days"],
  ["Mars", "687 Earth days"], ["Jupiter", "about 12 Earth years"], ["Saturn", "about 29 Earth years"],
  ["Uranus", "about 84 Earth years"], ["Neptune", "about 165 Earth years"]
].forEach(function (pair) {
  var years = ["88 Earth days", "225 Earth days", "365 days", "687 Earth days", "about 12 Earth years", "about 29 Earth years", "about 84 Earth years", "about 165 Earth years"];
  add("space", "Space", "About how long is a year on " + pair[0] + "?", pair[1], others(years, pair[1], 3, pair[0]));
});

[
  ["What does a light-year measure?", "Distance", "Time", "Brightness", "Mass"],
  ["About how long does sunlight take to reach Earth?", "About 8 minutes", "About 8 seconds", "About 8 hours", "About 8 days"],
  ["About how far is the Moon from Earth?", "About 384,000 kilometres", "About 384 kilometres", "About 150 million kilometres", "About 4 light-years"],
  ["About how far is Earth from the Sun?", "About 150 million kilometres", "About 150,000 kilometres", "About 384,000 kilometres", "About 9 million kilometres"],
  ["In a vacuum, light travels at about which speed?", "300,000 kilometres a second", "300 kilometres a second", "The speed of sound", "150 million kilometres an hour"],
  ["Which star is the closest known star to the Sun?", "Proxima Centauri", "Sirius", "Polaris", "Betelgeuse"],
  ["Which star is brightest in the night sky?", "Sirius", "Polaris", "Vega", "Canopus"],
  ["What is the name of our galaxy?", "The Milky Way", "Andromeda", "The Sombrero", "The Pinwheel"],
  ["Which large galaxy is the nearest to the Milky Way?", "Andromeda", "The Whirlpool Galaxy", "The Cartwheel Galaxy", "The Sombrero Galaxy"],
  ["The Plough, or Big Dipper, is part of which constellation?", "Ursa Major", "Orion", "Cassiopeia", "Crux"],
  ["What is the usual name of the North Star?", "Polaris", "Sirius", "Vega", "Altair"],
  ["The Southern Cross is which constellation?", "Crux", "Cygnus", "Orion", "Leo"],
  ["Which side of the Moon never faces Earth?", "The far side", "The sunlit side", "The north pole only", "The Sea of Tranquillity"],
  ["What is a meteorite?", "A space rock that reaches the ground", "A rock still in space", "A flash of light in the air", "A moon of Mars"],
  ["What is a meteor?", "A streak of light as a rock burns in the air", "A rock sitting on the ground", "A kind of comet tail", "A planet's ring"],
  ["The asteroid belt lies mainly between which planets?", "Mars and Jupiter", "Earth and Mars", "Saturn and Uranus", "Venus and Earth"],
  ["Halley's Comet returns about every how many years?", "76 years", "12 years", "365 days", "760 years"],
  ["Which force keeps the planets in orbit around the Sun?", "Gravity", "Magnetism alone", "Air pressure", "Friction"],
  ["Who was the first person to walk on the Moon?", "Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"],
  ["Who was the second person to walk on the Moon?", "Buzz Aldrin", "Neil Armstrong", "Michael Collins", "Alan Shepard"],
  ["Who stayed in lunar orbit during the Apollo 11 landing?", "Michael Collins", "Neil Armstrong", "Buzz Aldrin", "John Glenn"],
  ["In which year did people first walk on the Moon?", "1969", "1961", "1972", "1957"],
  ["Who was the first person to orbit Earth?", "Yuri Gagarin", "Neil Armstrong", "John Glenn", "Valentina Tereshkova"],
  ["In which year did Yuri Gagarin orbit Earth?", "1961", "1957", "1969", "1971"],
  ["Who was the first woman in space?", "Valentina Tereshkova", "Sally Ride", "Helen Sharman", "Mae Jemison"],
  ["In which year did Valentina Tereshkova fly in space?", "1963", "1961", "1983", "1991"],
  ["Which dog was the first animal to orbit Earth?", "Laika", "Belka", "Strelka", "Albert"],
  ["What was the first artificial satellite?", "Sputnik 1", "Explorer 1", "Telstar", "Hubble"],
  ["In which year was Sputnik 1 launched?", "1957", "1961", "1945", "1969"],
  ["Who was the first British person in space?", "Helen Sharman", "Tim Peake", "Michael Foale", "Piers Sellers"],
  ["In which year did Helen Sharman fly to the Mir space station?", "1991", "1986", "2001", "2015"],
  ["Which British ESA astronaut launched to the International Space Station in 2015?", "Tim Peake", "Helen Sharman", "Chris Hadfield", "Peggy Whitson"],
  ["Who made the first spacewalk?", "Alexei Leonov", "Neil Armstrong", "Ed White", "Bruce McCandless"],
  ["The Hubble Space Telescope was launched in which year?", "1990", "1977", "2001", "2021"],
  ["The James Webb Space Telescope was launched in which year?", "2021", "1990", "2012", "2009"],
  ["James Webb is designed mainly to observe which kind of light?", "Infrared", "X-rays", "Radio only", "Sound"],
  ["Voyager 1 and Voyager 2 were launched in which year?", "1977", "1969", "1986", "1990"],
  ["Which spacecraft flew past Uranus and Neptune?", "Voyager 2", "Voyager 1", "Pioneer 10", "New Horizons"],
  ["Which rover landed on Mars in 2012?", "Curiosity", "Perseverance", "Sojourner", "Opportunity"],
  ["Which rover landed on Mars in 2021?", "Perseverance", "Curiosity", "Spirit", "Viking 1"],
  ["New Horizons flew past Pluto in which year?", "2015", "2006", "1989", "2021"],
  ["Which spacecraft orbited Saturn from 2004 to 2017?", "Cassini", "Juno", "Galileo", "Rosetta"],
  ["The International Space Station orbits about how often?", "About once every 90 minutes", "Once a day", "Once a month", "Once a year"],
  ["NASA is the space agency of which country?", "The United States", "Russia", "China", "The United Kingdom"],
  ["ESA is the space agency of which place?", "Europe", "East Asia", "South America", "Australia only"],
  ["A solar eclipse happens when which body blocks the Sun's light?", "The Moon", "Mars", "Venus", "A comet"],
  ["A lunar eclipse happens when which body shades the Moon?", "Earth", "The Sun", "Mars", "Jupiter"],
  ["Gravity on the Moon is about which fraction of Earth's?", "About one sixth", "About one half", "About the same", "About twice as strong"],
  ["Olympus Mons is a huge volcano on which body?", "Mars", "Venus", "The Moon", "Io"],
  ["The Great Red Spot is a storm on which planet?", "Jupiter", "Saturn", "Neptune", "Mars"],
  ["Which moon is the largest in the solar system?", "Ganymede", "Titan", "The Moon", "Triton"],
  ["Titan, with a thick atmosphere, orbits which planet?", "Saturn", "Jupiter", "Neptune", "Mars"],
  ["Io is famous for which feature?", "Many active volcanoes", "A thick nitrogen atmosphere", "Being Earth's only moon", "A huge ocean with no ice"],
  ["Europa is thought to have which feature under its ice?", "An ocean of water", "A ring of rock", "A breathable atmosphere", "A molten iron desert"],
  ["Pluto was reclassified in 2006 as which of these?", "A dwarf planet", "A moon of Neptune", "A comet", "An asteroid of Mars"],
  ["Ceres is a dwarf planet in which region?", "The asteroid belt", "The Oort cloud", "Earth's orbit", "Saturn's rings"],
  ["The Kuiper belt lies beyond which planet?", "Neptune", "Mars", "Jupiter", "Venus"],
  ["What can light not escape from?", "A black hole", "A white dwarf", "A nebula", "The asteroid belt"],
  ["What is a supernova?", "An exploding star", "A new planet", "A solar eclipse", "A quiet white dwarf"],
  ["The Sun is mostly made of which element?", "Hydrogen", "Iron", "Oxygen", "Carbon"],
  ["About how old is the Sun?", "About 4.6 billion years", "About 4.6 million years", "About 10,000 years", "About 460 years"],
  ["Sunspots are which of these?", "Cooler, darker patches on the Sun", "Holes in the Moon", "Moons of Jupiter", "Cities of light"],
  ["An astronomical unit is about the distance from Earth to which body?", "The Sun", "The Moon", "Proxima Centauri", "The centre of the galaxy"],
  ["The same side of the Moon faces Earth because the Moon is what?", "Tidally locked", "Bigger than Earth", "A gas giant", "Inside the atmosphere"],
  ["Who discovered Uranus in 1781?", "William Herschel", "Galileo Galilei", "Clyde Tombaugh", "Johannes Kepler"],
  ["Neptune was found in which year?", "1846", "1781", "1930", "1610"],
  ["Pluto was discovered in which year?", "1930", "1846", "2006", "1781"],
  ["Who first turned a telescope on the sky and found Jupiter's four big moons?", "Galileo Galilei", "Isaac Newton", "Edwin Hubble", "Caroline Herschel"],
  ["Which Apollo mission was the last to land on the Moon?", "Apollo 17", "Apollo 11", "Apollo 13", "Apollo 1"],
  ["Which Apollo crew flew around the Moon in 1970 but did not land?", "Apollo 13", "Apollo 11", "Apollo 8", "Apollo 17"],
  ["Who was the last person to walk on the Moon during Apollo?", "Eugene Cernan", "Neil Armstrong", "Buzz Aldrin", "Michael Collins"],
  ["Apollo 8, in 1968, was the first crewed mission to do what?", "Orbit the Moon", "Land on Mars", "Walk in space", "Dock with Mir"],
  ["Which Soviet craft made the first soft landing on the Moon, in 1966?", "Luna 9", "Apollo 11", "Sputnik 1", "Viking 1"],
  ["Which space station did Helen Sharman visit?", "Mir", "Skylab", "Tiangong", "Salyut 1"],
  ["The first module of the International Space Station, Zarya, was launched in which year?", "1998", "1986", "1971", "2011"],
  ["Which country launched the first crewed flight of the Shenzhou programme in 2003?", "China", "Japan", "India", "The United Kingdom"],
  ["Who flew on Shenzhou 5, China's first crewed spaceflight?", "Yang Liwei", "Tim Peake", "Chris Hadfield", "Soichi Noguchi"],
  ["Sally Ride, in 1983, was the first American woman to do what?", "Fly in space", "Walk on the Moon", "Command the ISS", "Orbit Mars"],
  ["Mae Jemison, in 1992, is known as the first Black woman to do what?", "Fly in space", "Land on the Moon", "Direct NASA", "Discover a comet"],
  ["The Karman line, a common edge of space, is about how high?", "100 kilometres", "10 kilometres", "1,000 kilometres", "36,000 kilometres"],
  ["A geostationary satellite stays over one region at about which height?", "36,000 kilometres", "400 kilometres", "100 kilometres", "The Moon's distance"],
  ["Northern lights are also called which of these?", "Aurora borealis", "Aurora australis", "A solar eclipse", "The zodiacal light only"],
  ["Southern lights are also called which of these?", "Aurora australis", "Aurora borealis", "The Milky Way", "A meteor shower"],
  ["What is the main gas in the Sun?", "Hydrogen", "Nitrogen", "Carbon dioxide", "Iron"],
  ["A white dwarf is the leftover core of a star about the size of which of these?", "The Sun", "A neutron star already", "Jupiter only", "A comet"],
  ["A pulsar is a kind of which object?", "A spinning neutron star", "A planet", "A comet", "A galaxy"],
  ["Which mission's helicopter, Ingenuity, flew on Mars?", "Perseverance", "Curiosity", "Voyager 1", "Cassini"],
  ["Rosetta's lander Philae touched a comet in which year?", "2014", "1997", "2004", "2020"],
  ["Juno studies which planet?", "Jupiter", "Saturn", "Mars", "Mercury"],
  ["The Parker Solar Probe flies close to which body?", "The Sun", "Pluto", "The Moon", "Neptune"],
  ["Which UK rocket put the Prospero satellite into orbit in 1971?", "Black Arrow", "Saturn V", "Ariane 5", "Falcon 9"],
  ["Ariel 1, launched in 1962, was the first satellite of which country?", "The United Kingdom", "France", "Japan", "Canada"],
  ["What is on the Voyager golden records?", "Sounds and pictures from Earth", "A map of the Moon only", "Rocket fuel", "A live radio station"],
  ["Voyager 1 entered interstellar space in which year?", "2012", "1977", "1990", "2021"],
  ["Which planet has the Galilean moons Io, Europa, Ganymede and Callisto?", "Jupiter", "Saturn", "Uranus", "Neptune"],
  ["Phobos and Deimos are moons of which planet?", "Mars", "Earth", "Venus", "Mercury"],
  ["Which of these is a dwarf planet in the asteroid belt?", "Ceres", "Titan", "Europa", "Triton"],
  ["The Oort cloud is thought to be a distant store of which objects?", "Comets", "Planets", "Galaxies", "Black holes only"],
  ["A constellation is best described as which of these?", "A pattern of stars as seen from Earth", "A group of planets", "A single galaxy", "A moon system"],
  ["The Milky Way is which shape of galaxy?", "A barred spiral", "A perfect cube", "A single star", "A ring around Earth"],
  ["Who commanded Apollo 13?", "Jim Lovell", "Neil Armstrong", "Gene Kranz was on the ground", "Chris Hadfield"],
  ["Which American agency runs the Artemis Moon programme?", "NASA", "ESA", "JAXA", "ISRO"],
  ["ISRO is the space agency of which country?", "India", "Ireland", "Iceland", "Indonesia"],
  ["JAXA is the space agency of which country?", "Japan", "Jordan", "Jamaica", "Germany"],
  ["CNSA is the space agency of which country?", "China", "Canada", "Chile", "Czechia"],
  ["The first American to orbit Earth was which astronaut?", "John Glenn", "Alan Shepard, who flew a suborbital hop", "Neil Armstrong", "Buzz Aldrin"],
  ["Alan Shepard's 1961 Freedom 7 flight was which kind of trip?", "A suborbital hop", "A Moon landing", "A year on a station", "A Mars fly-by"],
  ["Skylab was a space station launched by which country?", "The United States", "The Soviet Union", "China", "The United Kingdom"],
  ["Salyut 1, launched in 1971, was the first of which kind of craft?", "A space station", "A Moon lander", "A Mars rover", "A weather balloon"],
  ["Which planet is named after the Roman god of the sea?", "Neptune", "Mars", "Mercury", "Saturn"],
  ["Which planet is named after the Roman god of war?", "Mars", "Venus", "Jupiter", "Mercury"],
  ["Which planet is named after the Roman messenger god?", "Mercury", "Mars", "Uranus", "Earth"],
  ["Uranus is named after a god from which tradition?", "Greek, a sky god", "Norse", "Egyptian", "Aztec"],
  ["Which of these is not one of the eight planets?", "Pluto", "Neptune", "Uranus", "Mercury"],
  ["Valles Marineris is a huge canyon on which body?", "Mars", "Venus", "Mercury", "Earth only"],
  ["Which moon of Neptune orbits backwards compared with most moons?", "Triton", "Titan", "Europa", "Phobos"],
  ["Charon is the large moon of which dwarf planet?", "Pluto", "Ceres", "Eris", "Makemake"],
  ["A shooting star is another name for which of these?", "A meteor", "A comet sitting still", "A planet", "A galaxy"],
  ["The Crab Nebula is the remains of a supernova seen in which century?", "The 11th century", "The 20th century", "The 1st century", "The 18th century"],
  ["Edwin Hubble showed that many 'nebulae' were actually what?", "Other galaxies", "Planets", "Comets", "Holes in the Sun"],
  ["The cosmic microwave background is light left from which event?", "The early hot universe", "Last night's sunset", "A single supernova", "The Moon landing"],
  ["A solar day on Earth is about how long?", "24 hours", "365 days", "28 days", "90 minutes"],
  ["Earth's axis is tilted by about how many degrees?", "23.5 degrees", "90 degrees", "0 degrees", "66 degrees exactly on its side"],
  ["Seasons happen mainly because Earth is what?", "Tilted as it orbits the Sun", "Closer to the Sun in summer everywhere", "Orbited by two moons", "Inside a nebula"],
  ["Which of these is a real Mars rover?", "Opportunity", "Enterprise", "Columbia the shuttle", "Gagarin"],
  ["Spirit and Opportunity landed on Mars in which year?", "2004", "1976", "2012", "2021"],
  ["Viking 1 landed on Mars in which year?", "1976", "1969", "1997", "2012"],
  ["Sojourner, a small rover, arrived with which 1997 mission?", "Mars Pathfinder", "Apollo 17", "Cassini", "Rosetta"],
  ["Which of these is a crewed Moon programme of the 1960s and 1970s?", "Apollo", "Voyager", "Curiosity", "Rosetta"]
].forEach(function (row) {
  add("space", "Space", row[0], row[1], [row[2], row[3], row[4]]);
});

require("./build-category-rest.js")(add, who, what, others, yearQ);

var body = out.map(function (item) {
  return JSON.stringify(item);
}).join(",\n  ");
var file = "/* Extra category questions for Wick. Stable facts, UK spelling. */\n(function () {\n  \"use strict\";\n  window.WICK_CATEGORY_EXTRA = [\n  " + body + "\n  ];\n})();\n";
fs.writeFileSync(path.join(dir, "questions-categories.js"), file);
console.log("wrote", out.length);
Object.keys(counts).sort().forEach(function (slug) {
  console.log(slug, counts[slug]);
});
