// Seeds the first 3 D1 teams (Taça Brasil Amador 2026) from registration
// forms: BRABOS, CARIBES, Sudoeste Paulista.
//
// Each team is upserted by (year, division, code). Its roster is wiped
// and reinserted on every run so re-running with a fixed name/jersey
// is safe and converges.
//
// Usage: node scripts/seed-d1-batch1.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const YEAR = 2026;
const DIVISION = "1";
const TOURNAMENT = "Taça Brasil Amador 2026";

const d = (s) => new Date(s);   // ISO yyyy-mm-dd

// iScore PT uses both "Destro/Canhoto" (Caribes) and "Direito/Esquerdo"
// (BRABOS, Sudoeste). Either way: right / left.
const R = "right", L = "left";

const teams = [
  {
    team: {
      name: "BRABOS",
      code: "BRA",
      imageFile: "brabos",
      location: "São Paulo - SP",
      email: "aota1992@gmail.com",
      division: DIVISION,
      tournament: TOURNAMENT,
      year: YEAR,
      coaches: [
        { name: "Rafael Aota", role: "head", phone: "11 98966-3919" },
        { name: "Enzo Nagata", role: "assistant", phone: "11 93313-7914" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 19, name: "Enzo Nagata",              email: "enzonagata11@gmail.com", birthDate: d("1994-09-08"), documentId: "49.142.830-3",  throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 11, name: "Henrique Akira Akagi",                                  birthDate: d("1998-09-20"), documentId: "53172910-2",    throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 13, name: "Luis Felipe Takeo Fujiwara",                            birthDate: d("1992-05-11"), documentId: "37.529.058-8",  throws: R, bats: R },
      { rosterNumber: 4,  jerseyNumber: 23, name: "Luiz Fábio Kenichi Yamashita",                          birthDate: d("1989-12-28"), documentId: "355470445",     throws: R, bats: R },
      { rosterNumber: 5,  jerseyNumber: 36, name: "Wagner Mikio Hayashi",                                  birthDate: d("1991-02-02"), documentId: "37405758-8",    throws: R, bats: R },
      { rosterNumber: 6,                    name: "Enzo Koga",                                              birthDate: d("1999-10-02"), documentId: "508430677",     throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 15, name: "Douglas Narita Hatakeyama",                              birthDate: d("1991-07-25"), documentId: "479004924",     throws: R, bats: R },
      { rosterNumber: 8,  jerseyNumber: 49, name: "Enzo Kawamura",                                          birthDate: d("2000-04-24"), documentId: "56.411.7440-7", throws: R, bats: R },
      { rosterNumber: 9,  jerseyNumber: 18, name: "Rafael Keidi Aota",                                      birthDate: d("1992-12-12"), documentId: "364000387",     throws: R, bats: R },
      { rosterNumber: 10, jerseyNumber: 17, name: "Plinio Hideki Kurata",                                   birthDate: d("1989-02-20"), documentId: "45.999.786-5",  throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 39, name: "Rodrigo Teiji Okamoto",                                  birthDate: d("1994-09-14"), documentId: "387580025",     throws: R, bats: R },
      { rosterNumber: 12, jerseyNumber: 84, name: "Renato Yonesake",                                        birthDate: d("1993-05-18"), documentId: "36.440.890-X",  throws: R, bats: R },
      { rosterNumber: 13, jerseyNumber: 55, name: "Kevin Y. Murakami",                                      birthDate: d("1994-08-19"), documentId: "35.907.707-9",  throws: R, bats: R },
      { rosterNumber: 14, jerseyNumber: 20, name: "Mario Orlando Grassi Junior",                            birthDate: d("1993-11-06"), documentId: "451359975",     throws: R, bats: R },
      { rosterNumber: 15, jerseyNumber: 51, name: "Gabriel Sato",                                           birthDate: d("1997-12-03"), documentId: "509135754",     throws: R, bats: R },
      { rosterNumber: 16, jerseyNumber: 7,  name: "Lucas Yamate",                                           birthDate: d("1996-11-13"), documentId: "37.469.499-0",  throws: R, bats: R },
      { rosterNumber: 17, jerseyNumber: 21, name: "Matheus Kenji Karubi Yokota",                            birthDate: d("1995-06-09"), documentId: "38.106.488-8",  throws: R, bats: R },
      { rosterNumber: 18, jerseyNumber: 97, name: "Andre Takayuki Nishimura",                               birthDate: d("1997-12-06"), documentId: "016.304.211-03", throws: R, bats: R },
    ],
  },

  {
    team: {
      name: "Caribes",
      code: "CRB",
      imageFile: "caribes",
      location: "Espírito Santo - ES",
      email: "luisespinozabelisario1988@gmail.com",
      division: DIVISION,
      tournament: TOURNAMENT,
      year: YEAR,
      coaches: [
        { name: "Victor Lopez", role: "head", phone: "27 99223-4892" },
        { name: "Luis Espinoza", role: "assistant", phone: "27 99624-0388" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 13, name: "Luis Antonio Espinoza Belisario",   email: "luisespinozabelisario1988@gmail.com", birthDate: d("1999-01-16"), documentId: "F772980-F",   nickname: "Luis B.",      throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 24, name: "Anderson Jesús López Rosario",      email: "anderson300916@gmail.com",            birthDate: d("1996-02-11"), documentId: "F031348-2",   nickname: "Anderson L.",  throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 41, name: "Victor Simon López Rosario",         email: "victorslr.010618@gmail.com",          birthDate: d("1995-06-19"), documentId: "F125788-R",   nickname: "Victor L.",    throws: R, bats: R },
      { rosterNumber: 4,  jerseyNumber: 23, name: "Deinnys Nicar Lizardi Belisario",   email: "deinnyslizardi@gmail.com",            birthDate: d("1995-03-02"), documentId: "F772938-E",   nickname: "Deinnys L.",   throws: R, bats: R },
      { rosterNumber: 5,  jerseyNumber: 12, name: "Orbel Neil Molina Rodriguez",       email: "orbelneilm@gmail.com",                birthDate: d("1988-07-14"), documentId: "F011046-U",   nickname: "Orbel M.",     throws: R, bats: R },
      { rosterNumber: 6,  jerseyNumber: 34, name: "Josue David Lara Hernandez",        email: "josue29lara500@gmail.com",            birthDate: d("2000-07-14"), documentId: "F570727-E",   nickname: "Josue L.",     throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 10, name: "João Pedro Batista",                email: "jpedrobatista777@gmail.com",          birthDate: d("2002-06-21"), documentId: "4197792",     nickname: "João B.",      throws: R, bats: R },
      { rosterNumber: 8,  jerseyNumber: 4,  name: "Jorge Luis Algaba Mejia",           email: "algabamejia@gmail.com",               birthDate: d("1975-12-06"), documentId: "3768871",     nickname: "Jorge M.",     throws: R, bats: R },
      { rosterNumber: 9,  jerseyNumber: 79, name: "Victor Manuel Garcia Martinez",     email: "victor.manoly@gmail.com",             birthDate: d("1987-11-29"), documentId: "08045832185", nickname: "Victor G.",    throws: R, bats: R },
      { rosterNumber: 10, jerseyNumber: 19, name: "Christian Ernesto Perez Armentero", email: "Christianperez1998p@gmail.com",       birthDate: d("1998-08-10"), documentId: "B188795-B",   nickname: "Christian P.", throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 5,  name: "Rafael Matos Medina",               email: "rmatosmedina@gmail.com",              birthDate: d("1983-12-09"), documentId: "4475733",     nickname: "Rafael M.",    throws: R, bats: R },
      { rosterNumber: 12,                    name: "Oel Duliep Lescaille",              email: "rogelioduliep49@gmail.com",           birthDate: d("1964-04-01"), documentId: "4.492.972-ES",nickname: "Oel D.",       throws: R, bats: R },
      { rosterNumber: 13, jerseyNumber: 77, name: "Kleiber Ronnyher Gonzalez Belisario", email: "kleibergonzalezbelisario@gmail.com", birthDate: d("2001-04-08"), documentId: "28111955",    nickname: "Kleiber G.",   throws: R, bats: R },
      // Ronald: bats Destro (R), throws Canhoto (L).
      { rosterNumber: 14, jerseyNumber: 99, name: "Ronald Lafredo Yactayo Rojas",      email: "ronaldyactayo@gmail.com",             birthDate: d("1988-03-07"), documentId: "G3799177",    nickname: "Ronald Y.",    throws: L, bats: R },
    ],
  },

  {
    team: {
      name: "Sudoeste Paulista",
      code: "SUD",
      imageFile: "sudoeste",
      location: "São Paulo - SP",
      email: "abe.mike@gmail.com",
      division: DIVISION,
      tournament: TOURNAMENT,
      year: YEAR,
      coaches: [
        { name: "Thiago Felipe dos Santos", role: "head",      phone: "11 91311-1330" },
        { name: "Michael Hiroyuki Abe",     role: "assistant", phone: "11 97634-3985" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 63, name: "Michael Hiroyuki Abe",          email: "abe.mike@gmail.com",            birthDate: d("1988-09-09"), documentId: "44.097.596-7", throws: R, bats: R },
      { rosterNumber: 2,  jerseyNumber: 40, name: "Airton Roberto Daikuzono",      email: "Airtonrd1@gmail.com",           birthDate: d("1985-09-27"), documentId: "29.233.486-2", throws: R, bats: R },
      { rosterNumber: 3,  jerseyNumber: 48, name: "Thiago Felipe dos Santos",      email: "thiagolipefe1306@gmail.com",    birthDate: d("1988-07-20"), documentId: "44.906.613-7", throws: R, bats: R },
      { rosterNumber: 4,  jerseyNumber: 4,  name: "José Wagner Moura Markies",     email: "wagnermouramarkies@gmail.com",  birthDate: d("1987-01-27"), documentId: "42.662.841-X", throws: R, bats: R },
      { rosterNumber: 5,  jerseyNumber: 19, name: "Flavio Yukio Yoshimura",        email: "flavio_1255@hotmail.com",       birthDate: d("1994-08-15"), documentId: "47.525.900-2", throws: R, bats: R },
      { rosterNumber: 6,  jerseyNumber: 26, name: "Nelson Murcia Garcia",          email: "nelsonmurciagarcia90@gmail.com", birthDate: d("1990-09-06"), documentId: "67.840.598-0", throws: R, bats: R },
      { rosterNumber: 7,  jerseyNumber: 9,  name: "Flavio Massahiro Siramizu",     email: "massahiro1987@gmail.com",       birthDate: d("1987-07-08"), documentId: "41246512",     throws: R, bats: R },
      { rosterNumber: 8,  jerseyNumber: 77, name: "Ricardo Lopes de Oliveira Filho", email: "ricardolof@gmail.com",        birthDate: d("1984-11-27"), documentId: "33.130.605-0", throws: L, bats: L },
      { rosterNumber: 9,  jerseyNumber: 91, name: "Henrique Minoru Hattori",       email: "hattori.noru@gmail.com",        birthDate: d("1991-04-24"), documentId: "15.411.10",    throws: R, bats: R },
      { rosterNumber: 10, jerseyNumber: 6,  name: "Robson Toshio Adati",            email: "robson.adati1@gmail.com",       birthDate: d("1984-02-20"), documentId: "41.020.936-3", throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 56, name: "Marcelo Yamada",                 email: "yamadamarcelo@hotmail.com",     birthDate: d("1975-02-17"), documentId: "17.225.931-9", throws: R, bats: R },
      // Sudoeste has two players carrying #19 in the form (Flavio + Jully).
      // Our compound (team, jerseyNumber) unique is partial — only enforced
      // when jerseyNumber is a number — so the duplicate would collide.
      // Dropping Jully's jersey for now; the team can disambiguate later.
      { rosterNumber: 12,                    name: "Jully Yukio Watanabe",          email: "jullyukio@hotmail.com",         birthDate: d("1990-09-27"), documentId: "46.652.650-7", throws: R, bats: R },
      { rosterNumber: 13, jerseyNumber: 17, name: "George Mendes Camargo",         email: "georgecamargo7@outlook.com",    birthDate: d("1995-07-28"), documentId: "41.692.700-2", throws: R, bats: R },
      { rosterNumber: 14, jerseyNumber: 28, name: "Diogo de Freitas Agostino",     email: "diogodefreitasagostini@yahoo.com.br", birthDate: d("1984-03-19"), documentId: "43.974.037-X", throws: R, bats: R },
      { rosterNumber: 15, jerseyNumber: 0,  name: "Guillermo Gustavo Daiber Filho", email: "ggdaiber@gmail.com",            birthDate: d("1975-05-18"), documentId: "9.944.869-5",  throws: R, bats: R },
      { rosterNumber: 16, jerseyNumber: 2,  name: "Rafael Yukio Ohi",               email: "ohi.rafael@gmail.com",          birthDate: d("1988-11-16"), documentId: "44.051.309-1", throws: R, bats: R },
      { rosterNumber: 17, jerseyNumber: 15, name: "Leonardo Naoto Hirosue",         email: "Leonardo.hirosue@gmail.com",    birthDate: d("1990-09-19"), documentId: "47.687.074-6", throws: R, bats: R },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  await Player.syncIndexes();
  await Team.syncIndexes();

  for (const { team, roster } of teams) {
    const t = await Team.findOneAndUpdate(
      { code: team.code, year: YEAR, division: DIVISION },
      { $set: team },
      { upsert: true, new: true }
    );
    await Player.deleteMany({ team: t._id });
    const docs = roster.map((p) => ({ team: t._id, ...p }));
    await Player.insertMany(docs);
    console.log(`✓ ${t.code.padEnd(4)} ${t.name.padEnd(22)} roster=${docs.length}`);
  }

  const all = await Team.find({ year: YEAR, division: DIVISION }, "code name").sort({ code: 1 });
  console.log("\nD1 teams in DB:");
  for (const t of all) console.log(`  ${t.code.padEnd(4)} ${t.name}`);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
