const {
    originateUser,
    retrieveUserById,
    retrieveUserByUserName,
    retrieveAllPlayers,
    // retrievePlayer,
    retrieveRecentMatchesFromPlayer,
    // retrieveWonMatchesFromPlayer,
    // totalMatchesFromAPlayerTeam,
    // totalMatchesFromPlayerByTournament,
    // totalWinsFromPlayerByTournament,
    // totalLossesFromPlayerByTournament,
    totalMatchesFromPlayer,
    // retrieveTeamsWithAtLeastOneWinFromPlayer,
    totalWinsFromPlayer,
    totalDrawsFromPlayer,
    totalLossesFromPlayer,
    // orderMatchesByScoringDifference,
    orderMatchesFromTournamentById,
    originateManyMatches,
    modifyMatchResult,
    modifyMatchResultToRemoveIt,
    retrieveMatchById,
    deleteMatchById,
    retrieveMatchesByQuery,
    retrieveMatches,
    // retrieveTournamentNames,
    // retrieveRecentTournamentNames,
    retrieveOngoingTournaments,
    retrieveTournamentById,
    // originateTournament,
    // retrieveTournaments,
    modifyFixtureFromTournamentVersionOne,
    modifyFixtureFromTournamentVersionTwo,
    modifyFixtureFromTournamentWhenEditing,
    modifyFixtureFromTournamentWhenRemoving,
    modifyTeamsFromTournament,
    // modifyFixtureFromTournamentWhenCreated,
} = require("./../service/service.js")

/* -------------------- HOME -------------------- */

const getHomeController = async (req, res) => {
    try {
        req.userId
            ? res.status(200).json({
                  user: {
                      id: req.userId,
                      name: req.userEmail,
                      nickname: req.userNickname,
                  },
              })
            : res
                  .status(200)
                  .json({ data: "El usuario aun no ha iniciado sesión" })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

/* -------------------- REGISTER -------------------- */

// const Joi = require("@hapi/joi");

// const schemaRegister = Joi.object({
//   email: Joi.string()
//     .min(6)
//     .messages({ "string.min": "El email debe tener al menos 6 caracteres" })
//     .max(255)
//     .required()
//     .email(),
//   password: Joi.string().min(8).max(1024).required().messages({
//     "string.min": "La contraseña debe tener al menos 8 caracteres",
//   }),
//   nickname: Joi.string().min(1).max(255).required(),
// });

const bcrypt = require("bcrypt")

const postRegisterController = async (req, res) => {
    try {
        // const { error } = schemaRegister.validate(req.body);

        // if (error) return res.status(400).json({ error: error.details[0].message });

        let { email, password, nickname } = req.body

        const doesUserExist = await retrieveUserByUserName(email)
        if (doesUserExist)
            return res.status(400).json({
                message: `Ya existe un usuario con el email ${doesUserExist.email}`,
            })

        const salt = await bcrypt.genSalt(10)
        const hiddenPassword = await bcrypt.hash(password, salt)

        const user = { email, password: hiddenPassword, nickname }

        const newUser = await originateUser(user)
        res.json({
            user: newUser,
            message: `Hola ${newUser.nickname}, se ha registrado con éxito`,
        })
    } catch (err) {
        return res.status(500).send({
            err,
            message: `Hubo un problema con el registro, intente más tarde`,
        })
    }
}

const jwt = require("jsonwebtoken")

const jwtKey = process.env.TOKEN_SECRET

const Joi = require("@hapi/joi")

const postLoginController = async (req, res) => {
    // Validation with custom messages //
    const schemaLogin = Joi.object({
        email: Joi.string().max(255).required().email().messages({
            "string.empty": `Ingrese un email`,
            "any.required": `El email es requerido`,
            "string.email": `Debe ingresar un email válido`,
        }),
        password: Joi.string().min(6).max(1024).required().messages({
            "string.min": `La contraseña debe tener un mínimo de {#limit} caracteres`,
            "string.empty": `Ingrese una contraseña`,
            "any.required": `La contraseña es requerida`,
        }),
    })

    try {
        const { error } = schemaLogin.validate(req.body)

        if (error)
            return res.status(400).json({
                auth: false,
                message: error.details[0].message,
            })

        let { email, password } = req.body

        const user = await retrieveUserByUserName(email)

        if (!user)
            return res.status(400).json({
                auth: false,
                message: "El usuario ingresado no existe",
            })

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid)
            return res.status(400).json({
                auth: false,
                message: "La contraseña ingresada no es correcta",
            })

        const token = jwt.sign(
            {
                id: user._id,
            },
            jwtKey,
            {
                //   algorithm: "HS256",
                expiresIn: "4h",
            }
        )

        const userInfo = {
            email: user.email,
            nickname: user.nickname,
        }

        return res
            .cookie("jwt", token, {
                withCredentials: true,
                maxAge: 1000 * 60 * 60 * 4, // 4 horas //
                sameSite: "none",
                httpOnly: true,
                secure: process.env.NODE_ENV === "development" ? false : true,
            })
            .status(200)
            .json({
                auth: true,
                userInfo,
                message: `Bienvenid@ ${user.nickname}`,
            })
    } catch (err) {
        return res.status(500).json({
            auth: false,
            message: `Error inesperado, intente más tarde`,
        })
    }
}

const postLogoutController = async (req, res) => {
    const token = req.cookies.jwt
    if (!token)
        return res
            .status(400)
            .json({ auth: false, message: "Primero debe iniciar sesión" }) // Revisar código de error //
    let decodedToken
    try {
        decodedToken = jwt.verify(token, process.env.TOKEN_SECRET)
    } catch (error) {
        res.status(400).json({
            auth: false,
            message: "Sesión no válida, error en las credenciales",
        })
    }
    const { id } = decodedToken
    try {
        const { nickname } = await retrieveUserById(id)
        return res
            .clearCookie("jwt", {
                withCredentials: true,
                sameSite: "none",
                httpOnly: true,
                secure: process.env.NODE_ENV === "development" ? false : true,
            })
            .status(200)
            .json({ auth: false, message: `Adiós ${nickname}` })
    } catch (err) {
        return res.status(500).json({
            auth: false,
            message: `Error inesperado, intente más tarde`,
        }) // Revisar código de error //
    }
}

const getIsUserAuthenticatedController = async (req, res) => {
    const token = req.cookies.jwt

    if (!token) return res.status(200).json({ auth: false }) // Revisar código de error //
    let decodedToken
    try {
        decodedToken = jwt.verify(token, process.env.TOKEN_SECRET)
    } catch (error) {
        res.status(400).json({
            auth: false,
            message: "Sesión no válida, error en las credenciales",
        })
    }
    const { id } = decodedToken

    try {
        const user = await retrieveUserById(id)
        const newToken = jwt.sign(
            {
                id: user._id,
            },
            jwtKey,
            {
                //   algorithm: "HS256",
                expiresIn: "4h",
            }
        )
        const { email, nickname } = user // TODO: Add user roles
        const userInfo = {
            email,
            nickname,
        }
        return res
            .cookie("jwt", newToken, {
                withCredentials: true,
                maxAge: 1000 * 60 * 60 * 4, // 4 horas //
                sameSite: "none",
                httpOnly: true,
                secure: process.env.NODE_ENV === "development" ? false : true,
            })
            .status(200)
            .json({
                auth: true,
                user: userInfo,
                message: `Hola ${nickname}, bienvenid@`,
            })
    } catch (err) {
        return res.status(500).json({
            auth: false,
            message: `Error inesperado, intente más tarde`,
        }) // Revisar código de error //
    }
}

const getTournamentsController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        res.status(200).json(tournaments)
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const postTournamentsController = async (req, res) => {
    try {
        res.status(200).json(req.body)
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getStandingsPlayerInfoController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        let playerStatsByTournament = []

        tournaments.forEach(async (tournament) => {
            let { players, id } = tournament
            let matches = await orderMatchesFromTournamentById(id)

            players.forEach((player) => {
                let totalMatches = matches.filter(
                    (match) =>
                        match.playerP1 === player.name ||
                        match.playerP2 === player.name
                ).length

                let totalWins = matches.filter(
                    (match) => match.outcome?.playerThatWon === player.name
                ).length

                let totalLosses = matches.filter(
                    (match) => match.outcome?.playerThatLost === player.name
                ).length

                let totalDraws = totalMatches - totalWins - totalLosses

                let totalPoints = totalWins * 3 + totalDraws

                playerStatsByTournament.push({
                    player,
                    tournament: tournament.name,
                    totalMatches,
                    totalWins,
                    totalDraws,
                    totalLosses,
                    totalPoints,
                })
                if (
                    playerStatsByTournament.length ===
                    players.length * tournaments.length
                )
                    res.send(playerStatsByTournament)
            })
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getFixtureByTournamentIdController = async (req, res) => {
    const tournamentId = req.params.id
    const { player, team } = req.query
    try {
        if (player) {
            const tournament = await retrieveTournamentById(tournamentId)
            const filteredFixture = tournament.fixture.filter(
                (match) =>
                    match.playerP1 === player || match.playerP2 === player
            )
            res.status(200).json({ ...tournament, fixture: filteredFixture })
        }
        if (team) {
            const tournament = await retrieveTournamentById(tournamentId)
            const filteredFixture = tournament.fixture.filter(
                (match) =>
                    match.teamIdP1 === Number(team) ||
                    match.teamIdP2 === Number(team)
            )
            res.status(200).json({ ...tournament, fixture: filteredFixture })
        }
        if (!team && !player) {
            const tournament = await retrieveTournamentById(tournamentId)
            res.status(200).json(tournament)
        }
        // Agregar excepción en caso de error
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const { fixture } = require("./../fixture-generation")

const postFixtureController = async (req, res) => {
    try {
        const { players, teams } = req.body
        const tournamentId = req.params.id
        const assignmentArray = []

        const tournament = await retrieveTournamentById(tournamentId)

        const teamsFromTournament = tournament.teams

        teams.forEach(async (element, index) => {
            let { id, team, logo } = teamsFromTournament.filter(
                (filtered) => filtered.id == element.split("|")[0]
            )[0] // Me quedo el único elemento de la lista

            let assignment = {
                id,
                player: players[index],
                team,
                logo,
            }

            assignmentArray.push(assignment)
        })

        // Actualizo "teams" dentro del torneo, para sumar la info de qué jugadores juegan con qué equipos. Es necesario para los standings //

        assignmentArray.forEach(async (assignment) => {
            let team = assignment.team
            let player = assignment.player

            await modifyTeamsFromTournament(tournamentId, team, player)
        })

        const updatedTournament = await retrieveTournamentById(tournamentId)

        const playersForFixtureGeneration = updatedTournament.players.map(
            ({ name }) => {
                return name
            }
        ) // REVISAR

        const definitiveFixture = fixture(
            assignmentArray,
            playersForFixtureGeneration // REVISAR
        ) // GENERO EL FIXTURE

        if (!definitiveFixture.error) {
            const matchesToBePlayed = definitiveFixture.map((match) => {
                return {
                    playerP1: match.playerP1,
                    playerP2: match.playerP2,
                    teamP1: match.teamP1,
                    teamP2: match.teamP2,
                    teamIdP1: match.teamIdP1,
                    teamIdP2: match.teamIdP2,
                    scoreP1: null,
                    scoreP2: null,
                    tournament: {
                        name: tournament.name,
                        id: tournament.id,
                    },
                }
            })

            await originateManyMatches(matchesToBePlayed)

            res.status(200).send({ status: "ok" })
        }
    } catch (err) {
        res.status(500).send("Something went wrong" + err)
    }
}

const putModifyGameController = async (req, res) => {
    //TODO: Accomodate matches inside each tournament, maybe?
    // const tournamentId = req.params.id
    const matchId = req.params.match
    try {
        // const tournament = await retrieveTournamentById(tournamentId)

        let {
            playerP1,
            teamP1,
            scoreP1,
            playerP2,
            teamP2,
            scoreP2,
            penaltyScoreP1,
            penaltyScoreP2,
        } = req.body

        let outcome

        if (scoreP1 - scoreP2 !== 0) {
            scoreP1 > scoreP2
                ? (outcome = {
                      playerThatWon: playerP1,
                      teamThatWon: teamP1,
                      scoreFromTeamThatWon: scoreP1,
                      playerThatLost: playerP2,
                      teamThatLost: teamP2,
                      scoreFromTeamThatLost: scoreP2,
                      draw: false,
                      scoringDifference: Math.abs(scoreP1 - scoreP2), // Es indistinto el orden, pues calculo valor absoluto.
                  })
                : (outcome = {
                      playerThatWon: playerP2,
                      teamThatWon: teamP2,
                      scoreFromTeamThatWon: scoreP2,
                      playerThatLost: playerP1,
                      teamThatLost: teamP1,
                      scoreFromTeamThatLost: scoreP1,
                      draw: false,
                      scoringDifference: Math.abs(scoreP1 - scoreP2), // Es indistinto el orden, pues calculo valor absoluto.
                  })
        } else if (
            scoreP1 - scoreP2 === 0 &&
            penaltyScoreP1 &&
            penaltyScoreP2
        ) {
            // Empate, y hubo penales
            penaltyScoreP1 > penaltyScoreP2
                ? (outcome = {
                      playerThatWon: playerP1,
                      teamThatWon: teamP1,
                      scoreFromTeamThatWon: penaltyScoreP1,
                      playerThatLost: playerP2,
                      teamThatLost: teamP2,
                      scoreFromTeamThatLost: penaltyScoreP2,
                      draw: true,
                      penalties: true,
                      scoringDifference: 0,
                  })
                : (outcome = {
                      playerThatWon: playerP2,
                      teamThatWon: teamP2,
                      scoreFromTeamThatWon: penaltyScoreP2,
                      playerThatLost: playerP1,
                      teamThatLost: teamP1,
                      scoreFromTeamThatLost: penaltyScoreP1,
                      draw: true,
                      penalties: true,
                      scoringDifference: 0,
                  })
        } else {
            // Empate, pero no hubo penales!
            outcome = {
                draw: true,
                penalties: false,
            }
        }

        const uploadedMatch = await modifyMatchResult(
            matchId,
            scoreP1,
            scoreP2,
            outcome
        )

        uploadedMatch
            ? res.status(200).send(uploadedMatch)
            : res.status(500).send({ error: "Match wasn't found in the DB" })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const putRemoveGameController = async (req, res) => {
    // const tournamentId = req.params.id
    const matchId = req.params.match

    try {
        const deletedResult = await modifyMatchResultToRemoveIt(matchId) // I make an update on the result in "face-to-face" collection

        deletedResult
            ? res.status(200).json(deletedResult)
            : res.status(500).json({
                  err: "Match couldn't be deleted because it wasn't found",
              })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getStandingsController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        const standingsArray = []

        let counter = 0

        tournaments.forEach(async (tournament) => {
            const standings = []

            let matches = await orderMatchesFromTournamentById(tournament.id)

            tournament.teams.forEach(async (team) => {
                let played = matches.filter(
                    (element) =>
                        element.teamP1 === team.team ||
                        element.teamP2 === team.team
                ).length
                let wins = matches.filter(
                    (element) => element.outcome.teamThatWon === team.team
                ).length
                let draws = matches.filter(
                    (element) =>
                        (element.teamP1 === team.team ||
                            element.teamP2 === team.team) &&
                        element.outcome.draw
                ).length
                let losses = matches.filter(
                    (element) => element.outcome.teamThatLost === team.team
                ).length
                let goalsFor =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0)
                let goalsAgainst =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0)
                let scoringDifference = goalsFor - goalsAgainst
                let points = wins * 3 + draws

                let { id, player, logo, teamCode } = team

                standings.push({
                    id,
                    team: team.team,
                    player, // REVISAR
                    logo,
                    teamCode,
                    played,
                    wins,
                    draws,
                    losses,
                    goalsFor,
                    goalsAgainst,
                    scoringDifference,
                    points,
                })
            })

            let sortedStanding = standings.sort(function (a, b) {
                if (a.points > b.points) return -1
                if (a.points < b.points) return 1

                if (a.scoringDifference > b.scoringDifference) return -1
                if (a.scoringDifference < b.scoringDifference) return 1

                if (a.goalsFor > b.goalsFor) return -1
                if (a.goalsFor < b.goalsFor) return 1

                if (a.goalsAgainst > b.goalsAgainst) return 1
                if (a.goalsAgainst < b.goalsAgainst) return -1
            })

            standingsArray.push({
                name: tournament.name,
                tournamentId: tournament.id,
                sortedStanding,
            })

            counter++

            if (counter === tournaments.length) {
                res.status(200).json(standingsArray)
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getPlayoffsTableController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        const allTeams = []

        let counter = 0

        tournaments.forEach(async (tournament) => {
            let matches = await orderMatchesFromTournamentById(tournament.id)

            tournament.teams.forEach(async (team) => {
                let played = matches.filter(
                    (element) =>
                        element.teamP1 === team.team ||
                        element.teamP2 === team.team
                ).length
                let wins = matches.filter(
                    (element) => element.outcome.teamThatWon === team.team
                ).length
                let draws = matches.filter(
                    (element) =>
                        (element.teamP1 === team.team ||
                            element.teamP2 === team.team) &&
                        element.outcome.draw
                ).length
                let losses = matches.filter(
                    (element) => element.outcome.teamThatLost === team.team
                ).length
                let goalsFor =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0)
                let goalsAgainst =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0)
                let scoringDifference = goalsFor - goalsAgainst
                let points = wins * 3 + draws

                let { id, player, logo, teamCode } = team

                allTeams.push({
                    id,
                    team: team.team,
                    player,
                    logo,
                    teamCode,
                    played,
                    wins,
                    draws,
                    losses,
                    goalsFor,
                    goalsAgainst,
                    scoringDifference,
                    points,
                })
            })

            counter++

            if (counter === tournaments.length) {
                let sortedPlayoffsTeams = allTeams.sort(function (a, b) {
                    if (a.points > b.points) return -1
                    if (a.points < b.points) return 1

                    if (a.scoringDifference > b.scoringDifference) return -1
                    if (a.scoringDifference < b.scoringDifference) return 1

                    if (a.goalsFor > b.goalsFor) return -1
                    if (a.goalsFor < b.goalsFor) return 1

                    if (a.goalsAgainst > b.goalsAgainst) return 1
                    if (a.goalsAgainst < b.goalsAgainst) return -1
                })
                res.status(200).json(sortedPlayoffsTeams)
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getPlayoffsPlayerInfoController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        let allMatches = []

        let matchesFromOngoingTournaments = []

        let counter = 0

        tournaments.forEach(async ({ id }) => {
            let matches = await orderMatchesFromTournamentById(id)
            if (!allMatches.length) {
                allMatches = matches
            } else {
                matchesFromOngoingTournaments = allMatches.concat(matches)
            }
            counter++
            if (counter === tournaments.length) {
                // REVISAR

                const playoffsPlayerStats = []

                const players = await retrieveAllPlayers()

                players.forEach((player) => {
                    let totalMatches = matchesFromOngoingTournaments.filter(
                        (match) =>
                            match.playerP1 == player.name ||
                            match.playerP2 == player.name
                    ).length

                    let totalWins = matchesFromOngoingTournaments.filter(
                        (match) => match.outcome?.playerThatWon == player.name
                    ).length

                    let totalLosses = matchesFromOngoingTournaments.filter(
                        (match) => match.outcome?.playerThatLost == player.name
                    ).length

                    let totalDraws = totalMatches - totalWins - totalLosses

                    let totalPoints = totalWins * 3 + totalDraws

                    playoffsPlayerStats.push({
                        player: {
                            name: player.name,
                            id: player._id,
                        },
                        totalMatches,
                        totalWins,
                        totalDraws,
                        totalLosses,
                        totalPoints,
                    })
                    if (playoffsPlayerStats.length === players.length)
                        res.send(playoffsPlayerStats)
                })
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getPlayoffsBracketController = async (req, res) => {
    try {
        const tournaments = await retrieveOngoingTournaments({ ongoing: true })

        const rankedTeams = []

        let counter = 0

        tournaments.forEach(async (tournament) => {
            let standings = []

            let matches = await orderMatchesFromTournamentById(tournament.id)

            tournament.teams.forEach(async (team) => {
                let played = matches.filter(
                    (element) =>
                        element.teamP1 === team.team ||
                        element.teamP2 === team.team
                ).length
                let wins = matches.filter(
                    (element) => element.outcome.teamThatWon === team.team
                ).length
                let draws = matches.filter(
                    (element) =>
                        (element.teamP1 === team.team ||
                            element.teamP2 === team.team) &&
                        element.outcome.draw
                ).length
                let losses = matches.filter(
                    (element) => element.outcome.teamThatLost === team.team
                ).length
                let goalsFor =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0)
                let goalsAgainst =
                    matches
                        .filter((element) => element.teamP1 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP2
                        }, 0) +
                    matches
                        .filter((element) => element.teamP2 === team.team)
                        .reduce((acc, curr) => {
                            return acc + curr.scoreP1
                        }, 0)
                let scoringDifference = goalsFor - goalsAgainst
                let points = wins * 3 + draws

                let { id, player, logo, teamCode } = team

                standings.push({
                    id,
                    team: team.team,
                    player,
                    logo,
                    teamCode,
                    played,
                    wins,
                    draws,
                    losses,
                    goalsFor,
                    goalsAgainst,
                    scoringDifference,
                    points,
                })
            })

            let sortedStanding = standings.sort(function (a, b) {
                if (a.points > b.points) return -1
                if (a.points < b.points) return 1

                if (a.scoringDifference > b.scoringDifference) return -1
                if (a.scoringDifference < b.scoringDifference) return 1

                if (a.goalsFor > b.goalsFor) return -1
                if (a.goalsFor < b.goalsFor) return 1

                if (a.goalsAgainst > b.goalsAgainst) return 1
                if (a.goalsAgainst < b.goalsAgainst) return -1
            })

            for (let i = 0; i < 8; i++) {
                rankedTeams.push(sortedStanding[i])
            }

            counter++

            if (counter === tournaments.length) {
                let sortedRankedTeams = rankedTeams.sort(function (a, b) {
                    if (a.points > b.points) return -1
                    if (a.points < b.points) return 1

                    if (a.scoringDifference > b.scoringDifference) return -1
                    if (a.scoringDifference < b.scoringDifference) return 1

                    if (a.goalsFor > b.goalsFor) return -1
                    if (a.goalsFor < b.goalsFor) return 1

                    if (a.goalsAgainst > b.goalsAgainst) return 1
                    if (a.goalsAgainst < b.goalsAgainst) return -1
                })
                res.status(200).json(sortedRankedTeams)
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getMatchesController = async (req, res) => {
    const { query } = req.query
    try {
        if (query) {
            const matches = await retrieveMatchesByQuery(query)
            res.json(matches)
        } else {
            const matches = await retrieveMatches(10)
            res.json(matches)
        }
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getStatisticsController = async (req, res) => {
    try {
        const players = await retrieveAllPlayers()
        const response = {
            playerStats: [],
            recentMatches: [],
            accolades: {},
        }
        let count = 0

        const recentMatches = await retrieveMatches(8)
        recentMatches.forEach((match) => {
            response.recentMatches.push({
                playerP1: match.playerP1,
                playerP2: match.playerP2,
                teamP1: match.teamP1,
                teamP2: match.teamP2,
                scoreP1: match.scoreP1,
                scoreP2: match.scoreP2,
                tournament: match.tournament.name,
                date: new Date(
                    parseInt(match.id.substring(0, 8), 16) * 1000
                ).toLocaleDateString(),
            })
        })

        const playerWins = []
        const playerDraws = []
        const playerLosses = []

        const matches = await retrieveMatches({})

        players.forEach(async (player) => {
            let totalMatches = matches.filter(
                (match) =>
                    match.playerP1 === player.name ||
                    match.playerP2 === player.name
            ).length

            let wins = matches.filter(
                (match) => match.outcome.playerThatWon === player.name
            ).length

            let losses = matches.filter(
                (match) => match.outcome.playerThatLost === player.name
            ).length

            let draws = totalMatches - wins - losses

            playerWins.push({
                player: player.name,
                wins,
            })

            playerDraws.push({
                player: player.name,
                draws,
            })

            playerLosses.push({
                player: player.name,
                losses,
            })

            response.playerStats.push({
                player: player.name,
                wins,
                draws,
                losses,
                totalMatches,
                effectiveness: Number(
                    (((wins * 3 + draws) / (totalMatches * 3)) * 100).toFixed(2)
                ),
            })

            count++
            if (count === players.length) {
                let sortedPlayerWins = playerWins.sort((a, b) =>
                    a.wins > b.wins ? -1 : 1
                )
                let sortedPlayerDraws = playerDraws.sort((a, b) =>
                    a.draws > b.draws ? -1 : 1
                )
                let sortedPlayerLosses = playerLosses.sort((a, b) =>
                    a.losses > b.losses ? -1 : 1
                )
                response.accolades.mostWins = {
                    player: sortedPlayerWins[0].player,
                    wins: sortedPlayerWins[0].wins,
                }
                response.accolades.mostDraws = {
                    player: sortedPlayerDraws[0].player,
                    draws: sortedPlayerDraws[0].draws,
                }
                response.accolades.mostLosses = {
                    player: sortedPlayerLosses[0].player,
                    losses: sortedPlayerLosses[0].losses,
                }
                res.status(200).send(response)
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const getStreaksController = async (req, res) => {
    try {
        const players = await retrieveAllPlayers()
        const response = {
            playerStreaks: [],
        }

        let count = 0

        players.forEach(async (player) => {
            let recentMatches = await retrieveRecentMatchesFromPlayer(
                player.name
            )

            let streak = recentMatches.map((match) => {
                if (match.outcome.playerThatWon === player.name)
                    return {
                        outcome: "w",
                        playerP1: match.playerP1,
                        teamP1: match.teamP1,
                        scoreP1: match.scoreP1,
                        playerP2: match.playerP2,
                        teamP2: match.teamP2,
                        scoreP2: match.scoreP2,
                        date: new Date(
                            parseInt(match.id.substring(0, 8), 16) * 1000
                        ).toLocaleDateString(),
                        tournament: match.tournament.name,
                    }
                else if (match.outcome.playerThatLost === player.name)
                    return {
                        outcome: "l",
                        playerP1: match.playerP1,
                        teamP1: match.teamP1,
                        scoreP1: match.scoreP1,
                        playerP2: match.playerP2,
                        teamP2: match.teamP2,
                        scoreP2: match.scoreP2,
                        date: new Date(
                            parseInt(match.id.substring(0, 8), 16) * 1000
                        ).toLocaleDateString(),
                        tournament: match.tournament.name,
                    }
                else
                    return {
                        outcome: "d",
                        playerP1: match.playerP1,
                        teamP1: match.teamP1,
                        scoreP1: match.scoreP1,
                        playerP2: match.playerP2,
                        teamP2: match.teamP2,
                        scoreP2: match.scoreP2,
                        date: new Date(
                            parseInt(match.id.substring(0, 8), 16) * 1000
                        ).toLocaleDateString(),
                        tournament: match.tournament.name,
                    }
            })

            response.playerStreaks.push({
                player: player.name,
                streak,
            })

            count++

            if (count === players.length) {
                res.status(200).send(response)
            }
        })
    } catch (err) {
        return res.status(500).send("Something went wrong!" + err)
    }
}

const hasANumberOfMatchesAchievement = async (
    amount,
    amoutOfMatchesFromPlayer
) => {
    // console.log(`${player}: ${allMatchesFromPlayer}`)
    let hasAchievement = false
    if (amoutOfMatchesFromPlayer >= amount) hasAchievement = true
    return hasAchievement
}

const hasANumberOfWinsAchievement = async (amount, amountOfWinsFromPlayer) => {
    let hasAchievement = false
    if (amountOfWinsFromPlayer >= amount) hasAchievement = true
    return hasAchievement
}

const hasANumberOfDrawsAchievement = async (
    amount,
    amountOfDrawsFromPlayer
) => {
    let hasAchievement = false
    if (amountOfDrawsFromPlayer >= amount) hasAchievement = true
    return hasAchievement
}

const achievements = async (req, res) => {
    try {
        const responseArray = []
        const players = await retrieveAllPlayers()
        players.forEach(async (player, index) => {
            let amoutOfMatchesFromPlayer = await totalMatchesFromPlayer(
                player.name
            )
            let amountOfWinsFromPlayer = await totalWinsFromPlayer(player.name)
            let amountOfDrawsFromPlayer = await totalDrawsFromPlayer(
                player.name
            )
            let hasAHundredMatches = await hasANumberOfMatchesAchievement(
                100,
                amoutOfMatchesFromPlayer
            )
            let hasTwoHundredAndFiftyMatches =
                await hasANumberOfMatchesAchievement(
                    250,
                    amoutOfMatchesFromPlayer
                )
            let hasFiveHundredMatches = await hasANumberOfMatchesAchievement(
                500,
                amoutOfMatchesFromPlayer
            )

            let hasAThousandMatches = await hasANumberOfMatchesAchievement(
                1000,
                amoutOfMatchesFromPlayer
            )

            let hasTwentyFiveWins = await hasANumberOfWinsAchievement(
                25,
                amountOfWinsFromPlayer
            )

            let hasFiftyWins = await hasANumberOfWinsAchievement(
                50,
                amountOfWinsFromPlayer
            )

            let hasAHundredWins = await hasANumberOfWinsAchievement(
                100,
                amountOfWinsFromPlayer
            )

            let hasAHundredAndFiftyWins = await hasANumberOfWinsAchievement(
                150,
                amountOfWinsFromPlayer
            )

            let hasTwoHundredAndFiftyWins = await hasANumberOfWinsAchievement(
                250,
                amountOfWinsFromPlayer
            )

            let hasTwentyFiveDraws = await hasANumberOfDrawsAchievement(
                25,
                amountOfDrawsFromPlayer
            )

            let hasFiftyDraws = await hasANumberOfDrawsAchievement(
                50,
                amountOfDrawsFromPlayer
            )

            let hasSeventyFiveDraws = await hasANumberOfDrawsAchievement(
                75,
                amountOfDrawsFromPlayer
            )

            let hasAHundredDraws = await hasANumberOfDrawsAchievement(
                100,
                amountOfDrawsFromPlayer
            )
            Promise.all([
                hasAHundredMatches,
                hasTwoHundredAndFiftyMatches,
                hasFiveHundredMatches,
                hasAThousandMatches,
                hasTwentyFiveWins,
                hasFiftyWins,
                hasAHundredWins,
                hasAHundredAndFiftyWins,
                hasTwoHundredAndFiftyWins,
                hasTwentyFiveDraws,
                hasFiftyDraws,
                hasSeventyFiveDraws,
                hasAHundredDraws,
            ])
                .then((values) => {
                    let hasAHundredMatches = values[0]
                    let hasTwoHundredAndFiftyMatches = values[1]
                    let hasFiveHundredMatches = values[2]
                    let hasAThousandMatches = values[3]
                    let hasTwentyFiveWins = values[4]
                    let hasFiftyWins = values[5]
                    let hasAHundredWins = values[6]
                    let hasAHundredAndFiftyWins = values[7]
                    let hasTwoHundredAndFiftyWins = values[8]
                    let hasTwentyFiveDraws = values[9]
                    let hasFiftyDraws = values[10]
                    let hasSeventyFiveDraws = values[11]
                    let hasAHundredDraws = values[12]
                    return {
                        player,
                        hasAHundredMatches,
                        hasTwoHundredAndFiftyMatches,
                        hasFiveHundredMatches,
                        hasAThousandMatches,
                        hasTwentyFiveWins,
                        hasFiftyWins,
                        hasAHundredWins,
                        hasAHundredAndFiftyWins,
                        hasTwoHundredAndFiftyWins,
                        hasTwentyFiveDraws,
                        hasFiftyDraws,
                        hasSeventyFiveDraws,
                        hasAHundredDraws,
                    }
                })
                .then((result) => {
                    responseArray.push(result)
                    if (responseArray.length === players.length)
                        res.send(responseArray)
                })
        })
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    getHomeController,
    postRegisterController,
    postLoginController,
    postLogoutController,
    getIsUserAuthenticatedController,
    getTournamentsController,
    postTournamentsController,
    getStandingsPlayerInfoController,
    getFixtureByTournamentIdController,
    postFixtureController,
    getStandingsController,
    getPlayoffsTableController,
    getPlayoffsPlayerInfoController,
    getPlayoffsBracketController,
    getMatchesController,
    putModifyGameController,
    putRemoveGameController,
    getStatisticsController,
    getStreaksController,
    achievements,
}
