const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Cannot be empty']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now()
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour.']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must be written by user']
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// preventing duplicate reviews
reviewSchema.index({tour: 1, user: 1}, { unique: true});

reviewSchema.pre(/^find/, function (next) {
    // this.populate({                            
    //     path:'tour',                             // tour field will be populated into the reviews
    //     select: 'name'                           // And it will include tour name
    // }).populate({
    //     path:'user',                             // user field will be populated into the reviews
    //     select: 'name photo'                     // And it will include user name
    // });

    this.populate({
        path: 'user',
        select: 'name photo'
    });
    next();
});

reviewSchema.statics.calAverageRatings = async function (tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: 'tour',
                nRating: { $sum: 1 },   // If there are 5 review documents for the current tour, then for each document, 1 will get added. So in the end, no. of ratings will be 5
                average: { $avg: '$rating' }
            }
        }
    ]);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].average
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }

};

// Create a new revoew and it should affect the average of overall rating
reviewSchema.post('save', function () {                  // post itself is like end. so next() method needn't be called at all

    // this points to current review
    this.constructor.calAverageRatings(this.tour);                                  // this points to current document & constructor is the model who creates the document
});

// findByIdAndUpdate  }_   For these both only query middlewares can be used
// findByIdAndDelete  }

reviewSchema.pre(/^findByOneAnd/, async function(next) {
    this.rev = await this.findOne();                // Using findOne() gives us access to current document
    console.log('review',this.rev);
    next();
});

reviewSchema.post(/^findByOneAnd/, async function() {
    // By the time it reaches this middleware, the data will be updated. So we needn't use findOne() here. 
    // But in above pre middleware it woudn't have been updated by that point. The status wouldnt be up-to-date.
    // So we had to split into two middlewares.
    await this.rev.constructor.calAverageRatings(this.rev.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;