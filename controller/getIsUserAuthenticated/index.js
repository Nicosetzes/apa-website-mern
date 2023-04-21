const { retrieveUserById } = require("./../../service")

const jwt = require("jsonwebtoken")
const jwtKey = process.env.TOKEN_SECRET

const getIsUserAuthenticated = async (req, res) => {
    const token = req.cookies.jwt

    if (!token)
        return res
            .status(400)
            .json({ auth: false, message: "Inicie sesión por favor" }) // Revisar código de error //

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
                expiresIn: "6h",
            }
        )
        const { _id, nickname } = user // TODO: Add user roles

        return res
            .cookie("jwt", newToken, {
                withCredentials: true,
                maxAge: 1000 * 60 * 60 * 6, // 6 horas //
                sameSite: "lax", // Meaning a cookie is only set when the domain in the URL of the browser matches the domain of the cookie, thus eliminating third party’s domains //
                httpOnly: process.env.NODE_ENV === "production",
                secure: process.env.NODE_ENV === "production",
            })
            .status(200)
            .send({
                auth: true,
                id: _id,
                message: `Hola ${nickname}, su sesión está activa`,
            })
    } catch (err) {
        return res.status(500).send({
            auth: false,
            message: `Error inesperado, intente más tarde`,
        }) // Revisar código de error //
    }
}

module.exports = getIsUserAuthenticated
