const AppError = require('./../utils/appError');

const handlecasteErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field ${value}! Please enter some other value`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid Input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJwtErrorDB = () => new AppError('Invalid token. Please login again!', 401);

const handleExpireErrorDB = () => new AppError('Your token has expired. Please login again!', 401);

const handleVariousErrors = (res, err) => {

    // Handling invalid database IDs
    if(err.name === 'CastError') {
        const castError = handlecasteErrorDB(err);
        return res.status(castError.statusCode).json({
            status: castError.status,
            message: castError.message,
        });
    }

    // Handling duplicates entered
    if(err.code === 11000){
        const duplicateError = handleDuplicateFieldsDB(err);
        return res.status(duplicateError.statusCode).json({
            status: duplicateError.status,
            message: duplicateError.message,
        });
    }

    // Handling validation errors - Ex: Difficulty given other than 3 options
    if(err.name === 'ValidationError') {
        const valiError = handleValidationErrorDB(err);
        console.log(valiError);
        return res.status(valiError.statusCode).json({
            status: valiError.status,
            message: valiError.message,
        });
    }

    // Handling authentication - that is protected routes must be availabke only for signed up users
    if(err.name === 'JsonWebTokenError' ) {
        const jwtError = handleJwtErrorDB(err);
        return res.status(jwtError.statusCode).json({
            status: jwtError.status,
            message: jwtError.message,
        });
    }

    // Handling token expire error
    if(err.name === 'TokenExpiredError'){
        const tokenExpireError = handleExpireErrorDB(err);
        return res.status(tokenExpireError.statusCode).json({
            status: tokenExpireError.status,
            message: tokenExpireError.message,
        });
    }

    // Other operational errors
    return res.status(err.statusCode).json({
        status: err.status,
        message: err,
    });

};

const sendErrorDev = (err, req, res) => {
    // A) API
    if(req.originalUrl.startsWith('/api')){
     return res.status(err.statusCode)
       .json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
  }
    // B) RENDERED WEBSITE
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendErrorProd = (err, req, res) => {
    // A) API
    if(req.originalUrl.startsWith('/api')){
        if (err) {
            handleVariousErrors(res, err);

        } else {
                return res.status(500).json({
                       status: 'Error',
                       msg: 'Something went very wrong!'
            });
        }
    }

    // B) RENDERED WEBSITE
     if(err.isOperational)
     {
        return res.status(err.statusCode).render('error', {
               title: 'Something went wrong',
               msg: 'Please try again later!'
        });
     }
        
    console.log('Error! ');
    return res.status(500).json({
        title: 'Something went wrong',
        msg: 'Please try again later!'
    });
    
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        sendErrorProd(err, req, res);
    }

    next();
};