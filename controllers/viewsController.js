const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync =  require('../utils/catchAsync');
const AppError =  require('../utils/appError');

exports.getOverview = catchAsync( async (req, res, next) => {
    // 1) GET tour data from the collection
    const tours = await Tour.find();

    // 2) Build the template


    // 3) Render that template using tour data from 1) 
    res.status(200).render('overview', {
        title: 'All tours',
        tours                            // advantage of ES6 of not using (tour: tour) - if the variable name & property name in
                                         // the object is same, you can use the shorthand notation and just write the variable name.
    });
});

exports.getTour = catchAsync( async(req, res, next) => {
    // 1) GET the data for requested data (including reviews and tour guide)
    const tour = await Tour.findOne({ slug: req.params.slug}).populate({
        path: 'reviews',
        fields: 'review rating user'
    });

    if(!tour){
        return next(new AppError('There is no tour with that name', 404));
    }

    // 2) Build template


    // 3) Render template using data from 1)

    res.status(200)
    // .set(
    //     'Content-Security-Policy',
    //     "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    //   )
        .render('tour', {
            title: `${tour.name} Tour`,
            tour
        });
});


exports.getLoginForm = (req, res) => {
    res.status(200)
    .render('login', {
        title: 'Login to your account',
    });
};

exports.getAccount = (req, res) => {
    res.status(200)
    .render('account', {
        title: 'Your account',
    });
};

exports.updateUserData = catchAsync(async(req, res) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    },
    {
        new: true,
        runValidators: true
    });

    res.status(200)
       .render('account', {
            title: 'Your account',
            user: updatedUser
        });

});