const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// models
const User = require("../../models/User");
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

// @route POST api/posts
// #desc create post

router.post(
  "/",
  [auth, [check("text", "Text field is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();

      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route GET api/posts
// @desc get all posts

router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({
      date: -1, // sorts by newest, if want oldest do 1
    });

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route GET api/posts/:post_id
// @desc get single post

router.get("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (!post) {
      return res.status(404).json({
        msg: "Post not found",
      });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({
        msg: "Post not found",
      });
    }

    res.status(500).send("Server error");
  }
});

// @route DEL api/posts/:post_id
// @descr delete a post

router.delete("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (!post) {
      return res.status(404).json({
        msg: "Post not found",
      });
    }

    // check if post user is the logged in user

    if (post.user.toString() !== req.user.id) {
      // post.user is a number, req.user.id is a string
      return res.status(401).json({
        msg: "Not authorized to delete",
      });
    }

    await post.remove();

    res.json("Post deleted");
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({
        msg: "Post not found",
      });
    }
    res.status(500).send("Server error");
  }
});

// @route PUT  api/posts/like/:post_id
// @desc Like a post

router.put("/like/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    // check if the post has already been liked

    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({
        msg: "Post already liked",
      });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route PUT  api/posts/unlike/:post_id
// @desc Unlike a post

router.put("/unlike/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    // check if the post has already been liked

    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).json({
        msg: "Post not liked",
      });
    }

    // Get the remove index of the post

    const postIndexToRemove = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(postIndexToRemove, 1);

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route POST api/posts/comment/:post_id
// #desc create comment

router.post(
  "/comment/:post_id",
  [auth, [check("text", "Text field is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.post_id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route DEL api/posts/comment/:post_id/:comment_id
// @desc delete comment

router.delete("/comment/:post_id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    // find commment

    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // check if comment exists

    if (!comment) {
      return res.status(404).json({
        msg: "No comment exists",
      });
    }

    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({
        msg: "User not authorized",
      });
    }

    // get the comment index

    const commentRemoveId = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(commentRemoveId, 1);

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
