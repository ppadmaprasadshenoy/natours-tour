class AppError extends Error {
    constructor(message, statusCode){
        super(message);                 // When we extend the parent class, we call super to extend the parent contructor
                                        // By puting message inside super(), we are already setting the message property. So no need of this.message

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail': 'error';
        this.isOperational = true;          // To send the user the error incase of some operational error

        Error.captureStackTrace(this, this.constructor);                 // Stack trace tells where exactly the error occurred 
                                                                         // this - current object, this.constructor - AppError class
    }
}

module.exports = AppError;