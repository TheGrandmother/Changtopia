class LocationInvalidError extends Error {
    constructor (location) {
        super(`Could not find ${location}`)
    }
}

module.exports = {
    LocationInvalidError
}
