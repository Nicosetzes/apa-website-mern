const createManyMatches = require("./createManyMatches")
const createMatch = require("./createMatch")
const createTournament = require("./createTournament")
const createUser = require("./createUser")
const findAllUsers = require("./findAllUsers")
const findMatches = require("./findMatches")
const findMatchesByTeamName = require("./findMatchesByTeamName")
const findMatchesByTournamentIds = require("./findMatchesByTournamentIds")
const findRecentMatchesFromPlayer = require("./findRecentMatchesFromPlayer")
const findTournamentById = require("./findTournamentById")
const findTournamentPlayersByTournamentId = require("./findTournamentPlayersByTournamentId")
const findTournaments = require("./findTournaments")
// const findTournamentTeamsByTournamentId = require("./findTournamentTeamsByTournamentId")
const findUserById = require("./findUserById")
const findUserByUserName = require("./findUserByUserName")
const sortMatchesFromTournamentById = require("./sortMatchesFromTournamentById")
const sortPlayoffMatchesFromTournamentById = require("./sortPlayoffMatchesFromTournamentById")
const updateMatchResult = require("./updateMatchResult")
const updateMatchResultToRemoveIt = require("./updateMatchResultToRemoveIt")

module.exports = {
    createManyMatches,
    createMatch,
    createTournament,
    createUser,
    findAllUsers,
    findMatches,
    findMatchesByTeamName,
    findMatchesByTournamentIds,
    findRecentMatchesFromPlayer,
    findTournamentById,
    findTournamentPlayersByTournamentId,
    findTournaments,
    // findTournamentTeamsByTournamentId,
    findUserById,
    findUserByUserName,
    sortMatchesFromTournamentById,
    sortPlayoffMatchesFromTournamentById,
    updateMatchResult,
    updateMatchResultToRemoveIt,
}