const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel')
const validator = require('validator');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have a length less than or equal to 40'],  // maxlength and minlength validators are only for strings
        minlength: [10, 'A tour name must have a length less than or equal to 10']
        // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    secretTour: {
        type: Boolean,
        default: false
    },
    duration:{
        type: Number,
        required: [true, 'A tour must have name'],
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have group size'],
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficulty is either: easy, medium, or difficult',
        },
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10    // Round off issue: 4.6 -> 5. But we want 4.7. So this way we can get it. round(4.6 * 10) = 47. Then 47/10 = 4.7 
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have price']
    },
    priceDiscount: {
        type:Number,
        validate: {
            validator: function(val){
                return val < this.price;
            },
            message: 'Discount price ({VALUE}) should be less than actual price'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have summary']
    },
    description: {
        type: String,
        trim: true,
        required: [true, 'A tour must have description']
    },
    duration: {
        type: String,
        trim: true,
        required: [true, 'A tour must have duration']
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have cover-image']
    },
    images: {
        type: [String]
    },
    createdAt: {
            type: Date,
            default: Date.now(),
            select: false
    },
    startDates: [Date],
    startLocation: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
   ],
   guides: [
       { 
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }
   ],
},
    {
        toJSON: { virtuals: true},
        toObject: { virtuals: true}
    }
);

tourSchema.index({price: 1, ratingsAverage: -1});    // 1 - ascending, 2 - descending    // vid- 167
tourSchema.index({ slug: 1});
tourSchema.index({ startLocation: '2dsphere'});

tourSchema.virtual('durationWeeks')
          .get(function(){                      // didnt use arrow function because 'this' cannot be used inside arrow function
                return this.duration/7;         // this points to the current document
          })

// // Virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// DOCUMENT MIDDLEWARE - runs before .save() and .create()

// if u want to display the tour name in URL as 'https://..../the-forest-hiker' and not 'https://..../The%20Forest%20Hiker'
tourSchema.pre('save', function(next) {                     // here hook is 'save'
    this.slug = slugify(this.name, {lower: true});
    next();
});

// tourSchema.pre('save', async function(next) {                     
//     const guidesPromises = this.guides.map(async id =>await User.findById(id));
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// tourSchema.pre('save', function(next) {                     // here hook is 'save'
//     console.log('Will save document...');
//     next();
// });

// tourSchema.post('save', function(doc, next) {
//     console.log(doc);
//     next();
// });

// QUERY MIDDLEWARE

// If for example, u want only VIP users to get some secret tours, u have to hide it from all users
tourSchema.pre(/^find/, function(next) {                     // here hook is 'find'
    this.find({ secretTour: { $ne : true}});
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function(next) {          
    this.populate({                             // guides field will be populated into the tours and u can view them doing GET tours reqst
        path:'guides',
        select: '-__v -passwordChangedAt'       // it will exclude __v and passwordChangedAt fields by using '-'
    })
    next();
});

tourSchema.post(/^find/, function(docs, next) {          
    console.log(`Query took ${Date.now() - this.start} milliseconds`)           
    console.log(docs);
    next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregation', function(next) {       
//     this.pipeline().unshift({ secretTour: { $ne : true}});
//     console.log(this.pipeline());
//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;