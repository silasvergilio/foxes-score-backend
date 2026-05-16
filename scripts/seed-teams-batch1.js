// Seeds 4 more registrations from the 2025 Taça Brasil Amador forms:
//   White Tigers, Highlanders, Foxes Academic, Triângulo Titans.
// Each team is upserted by `code`; its roster is wiped and reinserted so
// reruns are idempotent. Pirituba is untouched.
//
// Usage: node scripts/seed-teams-batch1.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const TOURNAMENT = "Taça Brasil Amador 2025";

const d = (s) => new Date(s); // ISO yyyy-mm-dd
const R = "right", L = "left", S = "switch";

const teams = [
  {
    team: {
      name: "White Tigers",
      code: "WT",
      imageFile: "wt",
      location: "Porto Alegre - RS",
      link: "https://www.instagram.com/whitetigerspoa/",
      email: "whitetigersmidia@gmail.com",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [
        { name: "Rodrigo Terada de Oliveira", role: "head", phone: "51 98031-9224" },
        { name: "Thiago Yuuki Kajiwara", role: "assistant", phone: "51 99252-5231" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 7,  name: "Fabrício Floriano Garcia dos Santos", email: "fabriciofloriano12@hotmail.com",  birthDate: d("1996-12-07"), documentId: "020-532-030:99",  throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 1,  name: "Jeffrey Jiunn Wei Lin",                email: "jeffrey.j.w.lin@gmail.com",       birthDate: d("1994-03-16"), documentId: "8091099294",     throws: R, bats: R },
      { rosterNumber: 3,                    name: "André Hisao Sasamori",                 email: "sasamori82@hotmail.com",          birthDate: d("1982-03-05"), documentId: "007.040.220-52", throws: R, bats: R },
      { rosterNumber: 4,                    name: "Luis Ernesto González Rojas",          email: "gonzalezluis02011997@gmail.com",  birthDate: d("1997-01-02"), documentId: "71169587208",    throws: R, bats: R },
      { rosterNumber: 5,  jerseyNumber: 59, name: "Peterson Timoteo Ribeiro",             email: "timoteo.peterson@hotmail.com",    birthDate: d("1983-05-11"), documentId: "313.751.938-13", throws: R, bats: R },
      { rosterNumber: 6,                    name: "Francisco Duran Peraza",               email: "franduran@gmail.com",             birthDate: d("1988-03-08"), documentId: "602.248.980-60", throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 11, name: "Romulo Rebello Quedinho",              email: "romuloquedinho@gmail.com",        birthDate: d("1997-01-24"), documentId: "147.232.627-09", throws: L, bats: L },
      { rosterNumber: 8,                    name: "Abraham Josué Navarro Bruzual",        email: "an3510711@gmail.com",             birthDate: d("2004-02-06"), documentId: "70822771217",    throws: R, bats: R },
      { rosterNumber: 9,  jerseyNumber: 56, name: "Matheus Amarante Vasconcellos",        email: "Matheus99x@hotmail.com",          birthDate: d("1999-08-16"), documentId: "1112792179",     throws: R, bats: R },
      { rosterNumber: 10,                   name: "Raphael Vasconcellos",                 email: "raphavasco73@gmail.com",          birthDate: d("2004-07-15"), documentId: "8124781405",     throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 34, name: "Rafael Rigon Paveglio",                email: "Rafaelpaveglio@gmail.com",        birthDate: d("1995-09-19"), documentId: "034.694.260-82", throws: R, bats: R },
      { rosterNumber: 12,                   name: "José Gregório Navarro",                                                         birthDate: d("2001-03-06"), documentId: "70832774278",    throws: R, bats: R },
      { rosterNumber: 13,                   name: "Thiago Yuuki Kajiwara",                email: "thiago.kajiwara@gmail.com",       birthDate: d("1991-02-04"), documentId: "345285042",      throws: R, bats: R },
      { rosterNumber: 14,                   name: "Adriano Bragança Rocha",               email: "adriano_personal@yahoo.com.br",   birthDate: d("1973-06-17"), documentId: "687.912.320-15", throws: R, bats: R },
      { rosterNumber: 15,                   name: "Eloy José Marsella González",          email: "marsella641@gmail.com",           birthDate: d("1986-04-22"), documentId: "F460592O",       throws: R, bats: R },
      { rosterNumber: 16,                   name: "Elvis Colmenares",                     email: "elviscolme13@gmail.com",          birthDate: d("1992-07-16"), documentId: "603.376.270-37", throws: R, bats: R },
      { rosterNumber: 17,                   name: "Josué Alejandro Gonzalez Marcano",     email: "josue18gzm@gmail.com",            birthDate: d("1996-01-14"), documentId: "706.885.182-73", throws: R, bats: R },
    ],
  },

  {
    team: {
      name: "Highlanders",
      code: "HIG",
      imageFile: "hig",
      location: "São Paulo - SP",
      link: "https://www.instagram.com/highlanders_baseball_beer/",
      email: "highlandersbaseballbeer@gmail.com",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [
        { name: "Marcelo Hiroshi Suzuki", role: "head", phone: "11 97310-8148" },
        { name: "Marcelo Henrique Omori", role: "assistant", phone: "11 97254-0489" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 51, name: "Marcelo Hiroshi Suzuki",     birthDate: d("1981-06-13"), documentId: "24.884.119-1 SSP/SP",  throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 77, name: "Mauricio Yukiyoshi Fukuda",  birthDate: d("1983-05-12"), documentId: "4.171.798 DGPC/GO",    throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 80, name: "Marcelo Henrique Omori",     birthDate: d("1980-10-29"), documentId: "29.506.820-6 SSP/SP",  throws: S, bats: R },
      { rosterNumber: 4,  jerseyNumber: 25, name: "Felipe Betschart",           birthDate: d("1980-01-10"), documentId: "32.990.572-5 SSP/SP",  throws: L, bats: R },
      { rosterNumber: 5,  jerseyNumber: 22, name: "Enzo Henrique Hideki Harada Costa", birthDate: d("1992-05-10"), documentId: "36.427.855-9 SSP/SP", throws: R, bats: R },
      { rosterNumber: 6,  jerseyNumber: 55, name: "Alfredo Yuji Yoshida",       birthDate: d("1975-04-11"), documentId: "18.976.267-6 SSP/SP",  throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 40, name: "Carlos Hideo Yamada",        birthDate: d("1974-12-23"), documentId: "19.704.434-7 SSP/SP",  throws: R, bats: R },
      { rosterNumber: 8,  jerseyNumber: 1,  name: "Claudio Kenji Yamada",       birthDate: d("1974-12-23"), documentId: "19.704.433-5 SSP/SP",  throws: R, bats: R },
      { rosterNumber: 9,  jerseyNumber: 13, name: "Oscar Luis Nuñes Ponce",     birthDate: d("1988-12-13"), documentId: "RNM 437.398-3",        throws: S, bats: R },
      { rosterNumber: 10, jerseyNumber: 44, name: "Silvio Renato Lima",         birthDate: d("1974-01-29"), documentId: "23.406.887-5",         throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 12, name: "Roberto Itiro Yamada",       birthDate: d("1968-10-28"), documentId: "13.464.013-5",         throws: R, bats: R },
      { rosterNumber: 12, jerseyNumber: 11, name: "Marcio Toshio Nishijima",    birthDate: d("1992-02-03"), documentId: "49.682.932-4",         throws: L, bats: L },
      { rosterNumber: 13, jerseyNumber: 10, name: "Anderson Masaki Yaga",       birthDate: d("1979-07-10"), documentId: "32.266.469-X SSP/SP",  throws: R, bats: R },
      { rosterNumber: 14, jerseyNumber: 74, name: "Jony Juniti Matsumoto",      birthDate: d("1974-05-16"), documentId: "18.975.841-7",         throws: R, bats: R },
      { rosterNumber: 15, jerseyNumber: 62, name: "José Takashi Horiguchi",     birthDate: d("1962-05-31"), documentId: "9.031.755 SSP/SP",     throws: R, bats: R },
      { rosterNumber: 16, jerseyNumber: 3,  name: "Andre Felipe Ninomiya",      birthDate: d("1979-03-04"), documentId: "23.053.152-0",         throws: R, bats: R },
    ],
  },

  {
    team: {
      // The form spells the team "FOXES ACADEMYC"; using the canonical name.
      name: "Foxes Academic",
      code: "FXS",
      imageFile: "fxs",
      location: "São Paulo - SP",
      link: "https://www.instagram.com/go.foxes/",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [{ name: "Shinji Shimozato", role: "head" }],
    },
    roster: [
      { rosterNumber: 1,                    name: "Bianca Ferreira De Souza",          email: "wasse38@gmail.com",         birthDate: d("2000-12-27"), documentId: "52.078.257-4", throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 2,  name: "Blake Farber",                      email: "Blake@farber.com",          birthDate: d("1985-06-26"), documentId: "F729215-C",    throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 72, name: "Daniel Vagner Stoco Nejelschi",     email: "daniel.stoco@gmail.com",    birthDate: d("1992-06-09"), documentId: "44228705-5",   throws: R, bats: R },
      // #4: form says "N 13 uniforme azul antigo" — that was the old uniform's
      // number; #13 is now Victor Trindade (rosterNumber 17). Leaving Danilo's
      // current jersey unassigned.
      { rosterNumber: 4,                    name: "Danilo Vagner Ourives Nejelschi",   email: "Dnejelschi@gmail.com",      birthDate: d("1987-12-08"), documentId: "44016246",     throws: L, bats: R },
      { rosterNumber: 5,                    name: "Eduardo Takahashi Garcia",          email: "edutgarcia@yahoo.com.br",   birthDate: d("1983-02-12"), documentId: "76436770",     throws: R, bats: R },
      { rosterNumber: 6,  jerseyNumber: 30, name: "Erick Ohanesian Polli",             email: "erick.ohanesian@gmail.com", birthDate: d("1995-10-08"), documentId: "50319523-6",   throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 31, name: "Felipe Tadao da Rocha Inakake",     email: "felipe.inakake@gmail.com",  birthDate: d("1997-02-15"), documentId: "50.849.349-3", throws: R, bats: R },
      { rosterNumber: 8,                    name: "Frank Marcos Paredes Herrada",      email: "Frankmarcosbr1@gmail.com",  birthDate: d("1995-04-11"), documentId: "F024928C",     throws: R, bats: R },
      { rosterNumber: 9,                    name: "Jesus Isaac Urdaneta Torres",       email: "Jesusisaac.org@gmail.com",  birthDate: d("2004-11-09"), documentId: "F240671-H",    throws: R, bats: R },
      { rosterNumber: 10,                   name: "Maercio Makoto Manabe",             email: "m3manabe@gmail.com",        birthDate: d("1975-11-13"), documentId: "19182248",     throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 71, name: "Mario Augusto Fonseca",             email: "mario.a.fonseca@gmail.com", birthDate: d("1971-09-03"), documentId: "21843066-8",   throws: R, bats: R },
      { rosterNumber: 12, jerseyNumber: 47, name: "Pedro Henrique Costa",              email: "pedrohc47@gmail.com",       birthDate: d("1998-08-03"), documentId: "393746501",    throws: R, bats: R },
      { rosterNumber: 13, jerseyNumber: 17, name: "Rafael Marins dos Santos",          email: "Marins.rafa@hotmail.com",   birthDate: d("2002-10-04"), documentId: "540244892",    throws: L, bats: L },
      { rosterNumber: 14,                   name: "Raéder de Carvalho",                email: "raeder.carvalho@hotmail.com", birthDate: d("1975-04-20"), documentId: "24.863.644-3", throws: R, bats: R },
      { rosterNumber: 15,                   name: "Rogerio Vieira da Silva",           email: "rvs.rogeriovieira@gmail.com", birthDate: d("1995-06-04"), documentId: "448335402", throws: R, bats: R },
      { rosterNumber: 16,                   name: "Victor Lopes Dias de Souza",        email: "victorlopesdiass@gmail.com", birthDate: d("2001-01-17"), documentId: "50.612.744-8", throws: R, bats: R },
      { rosterNumber: 17, jerseyNumber: 13, name: "Victor Trindade",                   email: "trindade.vict@gmail.com",   birthDate: d("1990-09-13"), documentId: "464527077",    throws: R, bats: R },
      // Wellington Fernandes: throws right, bats left.
      { rosterNumber: 18,                   name: "Wellington Fernandes",              email: "w.rhfernandes@gmail.com",   birthDate: d("1989-07-17"), documentId: "330749614",    throws: R, bats: L },
      { rosterNumber: 19,                   name: "Wellington Gonçalves da Cunha",     email: "cunha_tom@hotmail.com",     birthDate: d("1991-04-24"), documentId: "48700723-2",   throws: R, bats: R },
    ],
  },

  {
    team: {
      name: "Triângulo Titans",
      code: "TIT",
      imageFile: "tit",
      // Location not stated on form; coaches' phones suggest 11/34 (SP/MG).
      // Left blank; update via PUT /teams when confirmed.
      email: "yassushi_okada@hotmail.com",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [
        { name: "Matheus Nishida", role: "head", phone: "(11)973912447" },
        { name: "Tiago Carneiro", role: "assistant", phone: "(34)96744886" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 5,  name: "Yassushi M. A. Okada",         email: "yassushi_okada@hotmail.com",        birthDate: d("1993-03-05"), documentId: "15439312",        throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 27, name: "Gabriel Goularte Amaral",      email: "gabrielgoularteeng@gmail.com",      birthDate: d("1997-05-23"), documentId: "16048902",        throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 30, name: "Julio Baboghlian Durães",      email: "julio.d.baboghlian@gmail.com",      birthDate: d("1995-10-19"), documentId: "50.888.597-8",    throws: L, bats: L },
      { rosterNumber: 4,  jerseyNumber: 62, name: "Henrique Massayuki Kaneji",    email: "henriquekaneji@gmail.com",          birthDate: d("1986-03-08"), documentId: "34.665.475-0",    throws: R, bats: R },
      { rosterNumber: 5,  jerseyNumber: 10, name: "Tiago Moreira Carneiro",       email: "engtmc@icloud.com",                 birthDate: d("1990-02-16"), documentId: "107.286.636-60",  throws: R, bats: R },
      { rosterNumber: 6,  jerseyNumber: 8,  name: "Flávio Goularte Resende",      email: "flavio.gores@hotmail.com",          birthDate: d("1992-03-11"), documentId: "17.081.636",      throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 25, name: "Mateus Nishida Máximo da Cruz",email: "nishida.maximo@gmail.com",          birthDate: d("1991-04-11"), documentId: "47.645.071-8",    throws: L, bats: R },
      { rosterNumber: 8,  jerseyNumber: 11, name: "José Rafael Alvarado Pereira", email: "josealvaradopereira@gmail.com",     birthDate: d("1991-09-16"), documentId: "705.700.812.03",  throws: L, bats: L },
      { rosterNumber: 9,  jerseyNumber: 79, name: "Aldemy de Oliveira Siqueira Júnior", email: "japadrama1@gmail.com",        birthDate: d("1979-11-16"), documentId: "1020363-0",       throws: R, bats: R },
      { rosterNumber: 10, jerseyNumber: 16, name: "Alexander Ramos Rondon",       email: "alitoramosrondon1@gmail.com",       birthDate: d("2005-02-15"), documentId: "F457229E",        throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 17, name: "Alyson Shudi Ito",             email: "itoalysson@hotmail.com",            birthDate: d("1978-12-02"), documentId: "6082712-5 SSP/PR", throws: R, bats: R },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  // Make sure mPlayer indexes match the new partial unique index.
  await Player.syncIndexes();

  for (const { team, roster } of teams) {
    const t = await Team.findOneAndUpdate(
      { code: team.code },
      { $set: team },
      { upsert: true, new: true }
    );
    await Player.deleteMany({ team: t._id });
    const docs = roster.map((p) => ({ team: t._id, ...p }));
    await Player.insertMany(docs);
    console.log(`✓ ${t.code.padEnd(4)} ${t.name.padEnd(20)} roster=${docs.length}`);
  }

  const all = await Team.find({}, { code: 1, slot: 1, name: 1 }).sort({ code: 1 });
  console.log("\nteams in DB:");
  for (const t of all) console.log(`  ${t.code.padEnd(4)} ${(t.slot || "-").padEnd(3)} ${t.name}`);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
