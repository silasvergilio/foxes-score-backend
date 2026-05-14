// Node runner: connects via Mongoose using .env and seeds Pirituba.
// Usage: node scripts/seed-pirituba.node.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  const teamsDeleted = await Team.deleteMany({});
  const playersDeleted = await Player.deleteMany({});
  console.log(
    `wiped: teams=${teamsDeleted.deletedCount} players=${playersDeleted.deletedCount}`
  );

  // Drop the old unique index on playerNumber if it lingers from the previous schema.
  try {
    const idx = await Player.collection.indexes();
    for (const i of idx) {
      if (i.name !== "_id_" && i.name !== "team_1_jerseyNumber_1") {
        await Player.collection.dropIndex(i.name);
        console.log("dropped stale index:", i.name);
      }
    }
  } catch (e) {
    console.log("index cleanup skipped:", e.message);
  }
  await Player.syncIndexes();

  const team = await Team.create({
    name: "Pirituba Beisebol",
    code: "PTB",
    imageFile: "ptb",
    location: "São Paulo - SP",
    link: "https://www.instagram.com/pirittubabeisebol",
    email: "piritubabaseball@gmail.com",
    division: "2",
    tournament: "Taça Brasil Amador 2025",
    coaches: [
      { name: "Leonardo Reis", role: "head", phone: "11 999876291" },
      { name: "Wilson Junior", role: "assistant" },
    ],
  });
  console.log("team _id:", team._id.toString());

  const roster = [
    { rosterNumber: 1,  jerseyNumber: 98, name: "Antônio Pereira da Silva",          nickname: "Toninho",   email: "mukachavez107@gmail.com",       birthDate: new Date("1997-08-22"), documentId: "3963673894",     throws: "right", bats: "right" },
    { rosterNumber: 2,  jerseyNumber: 27, name: "Wilson Pereira Lima Costa Junior",  nickname: "W.Junior",  email: "wwwilsonjr27@gmail.com",        birthDate: new Date("1992-12-26"),                                throws: "right", bats: "right" },
    { rosterNumber: 3,  jerseyNumber: 22, name: "Nícolas Martins Cordeiro Rodrigues",nickname: "Nicolas",   email: "ncrodrigues.eng@gmail.com",     birthDate: new Date("1991-10-08"), documentId: "36.421.607-4",   throws: "right", bats: "right" },
    { rosterNumber: 4,  jerseyNumber: 10, name: "Jose Claudio Bezerra de Lacerda",   nickname: "Claudio",   email: "claudio_messenger@hotmail.com", birthDate: new Date("1995-06-11"), documentId: "62.701.594-3",   throws: "right", bats: "right" },
    { rosterNumber: 5,  jerseyNumber: 75, name: "Welferson de Souza Lima",           nickname: "W.Lima",    email: "wefferson75@gmail.com",         birthDate: new Date("2000-08-02"), documentId: "59.239.164-4",   throws: "right", bats: "right" },
    { rosterNumber: 6,  jerseyNumber: 99, name: "Gabriel da Silva",                  nickname: "Gabriel",   email: "Gabriel.ferr.007@gmail.com",    birthDate: new Date("1990-01-21"), documentId: "44022178X",      throws: "right", bats: "right" },
    { rosterNumber: 7,  jerseyNumber: 2,  name: "Allan Bruno Manha Alves de Souza",  nickname: "Megatronn", email: "Allanbrunosouza@gmail.com",     birthDate: new Date("2001-01-27"), documentId: "465.837.108-11", throws: "right", bats: "right" },
    { rosterNumber: 8,  jerseyNumber: 58, name: "Elisvan da Silva Martins",          nickname: "Noa",       email: "Elisban18@gmail.com",           birthDate: new Date("1992-12-09"), documentId: "491559008",      throws: "right", bats: "right" },
    { rosterNumber: 9,  jerseyNumber: 77, name: "Arthur William Granero Santos",     nickname: "Arthur",    email: "arthurwgs@yahoo.com.br",        birthDate: new Date("1977-07-18"), documentId: "29.415.505-3",   throws: "right", bats: "right" },
    { rosterNumber: 10, jerseyNumber: 93, name: "Emerson da Silva Martins",          nickname: "Emerson",   email: "Silvamartins846@gmail.com",     birthDate: new Date("1993-12-04"), documentId: "520182200",      throws: "right", bats: "right" },
    { rosterNumber: 11, jerseyNumber: 3,  name: "Julio Cesar Gonçalves da Silva",    nickname: "Julio",     email: "jv22091807@gmail.com",          birthDate: new Date("1998-07-18"), documentId: "526701778",      throws: "left",  bats: "left"  },
    { rosterNumber: 12, jerseyNumber: 5,  name: "Weverton Nascimento da Silva",      nickname: "Boy",       email: "weverthonjogador@gmail.com",    birthDate: new Date("2025-04-11"), documentId: "47.188.940-4",   throws: "right", bats: "right" },
    { rosterNumber: 13, jerseyNumber: 17, name: "Jhonny Roberto Román Solarte",      nickname: "Jhonny",    email: "jhonny19720630@gmail.com",      birthDate: new Date("1990-05-11"), documentId: "G486494-B",      throws: "right", bats: "right" },
  ].map((p) => ({ team: team._id, ...p }));

  const inserted = await Player.insertMany(roster);
  console.log("inserted players:", inserted.length);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
