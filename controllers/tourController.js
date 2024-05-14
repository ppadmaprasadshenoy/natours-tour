const multer = require('multer');
const sharp = require('sharp');   

const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
// const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image. Please upload an image!', 400), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1},
    { name: 'images', maxCount: 3}
]);

exports.resizeTourImages = catchAsync( async(req, res, next) => {
    if(!req.files.imageCover || !req.files.images) return next();

    // 1 - Cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.file.imageCover.buffer)
                .resize(2000,1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${req.body.imageCover}`);

    // 2 - Images
    req.body.images = []

    await Promise.all(req.body.images.map( async(file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
        .resize(2000,1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

        req.body.images.push(filename);
    }));

    next();
});

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numRatings: { $sum: '$ratingsQuantity' },
                numTours: { $sum: 1 },
                avgRating: { $avg: '$ratingsAverage' },
                avgprice: { $avg: '$price' },
                minprice: { $min: '$price' },
                maxprice: { $max: '$price' },
            }
        },
        { $sort: { avgprice: 1 } }     //1 for ascending order
    ]);
    res.status(200).json({
        status: 'Success',
        data: {
            stats
        }
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;          // 2021

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: {
                _id: 0                  // project tells not to display id in in the response
            }
        },
        {
            $sort: { numTourStarts: -1 }     // descending order
        },
        {
            $limit: 12                      // display 12 items
        }
    ]);
    res.status(200).json({
        status: 'Success',
        data: {
            plan
        }
    });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;      // if not miles then second option is km

    const [lat, lng] = latlng.split(',');
    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format lat,lng.', 404));
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    // $geoWithin: - MongoDB geospatial operator. 
    // It selects documents with geospatial data that exists entirely within a specified shape. 
    // In this case, it's a sphere defined by a center and a radius.

    res.status(200).json({
        status: 'Success',
        result: tours.length,
        data: {
            data: tours
        }
    });

});

// Trying to get the nearest tour point from your current location
exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!lat || !lng) {
        next(
            new AppError('Please provide latitude and longitude in the format lat,lng.', 404)
        );
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier                 // same as dividing by 1000
            }
        },
        {
            $project: {                                     // project - when u want to display only certain fields
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'Success',
        data: {
            data: distances
        }
    });

});