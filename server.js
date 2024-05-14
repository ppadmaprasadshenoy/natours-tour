const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

process.on('UnhandledException', () => {
    console.log('UNHANDLED EXCEPTION! Shutting down...');
    console.log(err.name, err.message);

    // Don't shut server first because the application itself is in unclean state. So process need to be shut down
    process.exit(1);                        // 0 - success, 1 for unhandled rejection/exception

});

const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then(console.log('DB connection established'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

process.on('UnhandledRejection', () => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);

    // Systematic way of closing is - First shut the server, then the process(application)
    server.close(() => {
        process.exit(1);                        // 0 - success, 1 for unhandled rejection/exception
    })
});
