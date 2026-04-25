const rateLimitStore = {};

function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    if (!rateLimitStore[ip]) {
        rateLimitStore[ip] = {
            count: 1,
            startTime: now
        };
        return next();   
    }

    const userData = rateLimitStore[ip];

    if (now - userData.startTime < 60000) {
        if (userData.count >= 5) {
            const retryAfter = Math.ceil((60000 - (now - userData.startTime)) / 1000);

            return res.status(429).json({
                message: "Too many requests",
                retryAfter
            });
        }

        userData.count++;
        return next();
    }

    rateLimitStore[ip] = {
        count: 1,
        startTime: now
    };

    next();
}

module.exports = rateLimiter;
