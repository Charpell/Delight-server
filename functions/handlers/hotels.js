const { db } = require('../util/admin');

exports.getAllHotels = (req, res) => {
  db.collection('hotels')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let hotels = [];
      data.forEach((doc) => {
        hotels.push({
          hotelId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(hotels);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postOneHotel = (req, res) => {
  if (req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  const newHotel = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection('hotels')
    .add(newHotel)
    .then((doc) => {
      const resHotel = newHotel;
      resHotel.screamId = doc.id;
      res.json(resHotel);
    })
    .catch((err) => {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    });
};
// Fetch one hotel
exports.getHotel = (req, res) => {
  let hotelData = {};
  db.doc(`/hotels/${req.params.hotelId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'hotel not found' });
      }
      hotelData = doc.data();
      hotelData.hotelId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('hotelId', '==', req.params.hotelId)
        .get();
    })
    .then((data) => {
      hotelData.comments = [];
      data.forEach((doc) => {
        hotelData.comments.push(doc.data());
      });
      return res.json(hotelData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Comment on a comment
exports.commentOnhotel = (req, res) => {
  if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    hotelId: req.params.hotelId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  console.log(newComment);

  db.doc(`/hotels/${req.params.hotelId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'hotel not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
};
// Like a hotel
exports.likehotel = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('hotelId', '==', req.params.hotelId)
    .limit(1);

  const hotelDocument = db.doc(`/hotels/${req.params.hotelId}`);

  let hotelData;

  hotelDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        hotelData = doc.data();
        hotelData.hotelId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'hotel not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            hotelId: req.params.hotelId,
            userHandle: req.user.handle
          })
          .then(() => {
            hotelData.likeCount++;
            return hotelDocument.update({ likeCount: hotelData.likeCount });
          })
          .then(() => {
            return res.json(hotelData);
          });
      } else {
        return res.status(400).json({ error: 'hotel already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikehotel = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('hotelId', '==', req.params.hotelId)
    .limit(1);

  const hotelDocument = db.doc(`/hotels/${req.params.hotelId}`);

  let hotelData;

  hotelDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        hotelData = doc.data();
        hotelData.hotelId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'hotel not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'hotel not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            hotelData.likeCount--;
            return hotelDocument.update({ likeCount: hotelData.likeCount });
          })
          .then(() => {
            res.json(hotelData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Delete a hotel
exports.deletehotel = (req, res) => {
  const document = db.doc(`/hotels/${req.params.hotelId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'hotel not found' });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'hotel deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
