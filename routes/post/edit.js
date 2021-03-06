const e = require('express');
const { getPostById, modifyPost, addTagToPost, deleteTagFromPost } = require('../../data/posts');
const { getUserByToken } = require('../../data/users');
const { getClassById } = require('../../data/classes');
const Router = e.Router();
const xss = require('xss');

Router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const userLookup = await getUserByToken(req.session.token);
    const postLookup = await getPostById(id);
    if (userLookup.error) {
        res.status(postLookup.statusCode).render('error', {
            title: 'Error',
            error: userLookup.error,
            loggedIn: req.session.token ? true : false,
        });
    } else if (postLookup.error) {
        res.status(postLookup.statusCode).render('error', {
            title: 'Error',
            error: postLookup.error,
            loggedIn: req.session.token ? true : false,
        });
    } else if (postLookup.post.author !== userLookup.user._id.toString() && userLookup.user.type !== 'instructor') {
        res.status(401).render('error', {
            title: 'Error',
            error:
                'You are not the author of this post, and cannot edit this post.',
            loggedIn: req.session.token ? true : false,
        });
    } else {
        const classid = postLookup.post.class;
        const classLookup = await getClassById(classid);
        if(classLookup.error){
            res.status(classLookup.statusCode).render('error', {
                title: 'Error',
                error: classLookup.error,
                loggedIn: req.session.token ? true : false,
            });
        }
        let classTags = classLookup.class.tags;
        let postTags = postLookup.post.tags;
        let availableTags = classTags.filter(x => postTags.indexOf(x) === -1);

        res.render('edit_post', {
            title: `Edit ${postLookup.post.title}`,
            post: postLookup.post,
            loggedIn: req.session.token ? true : false,
            availableTags: availableTags,
            currTags: postTags,
            isInstructor: userLookup.user.type === 'instructor' ? true : false,
        });
    }
});

Router.post('/', async (req, res) => {
    const id = xss(req.body['post-id']);
    const userLookup = await getUserByToken(req.session.token);
    const postLookup = await getPostById(id);
    const tags = xss(req.body['post-tag']);
    const delTags = xss(req.body['delete-tag']);

    if (userLookup.error) {
        res.status(userLookup.statusCode).render('error', {
            title: 'Error',
            error: userLookup.error,
        });
    } else if (postLookup.error) {
        res.status(postLookup.statusCode).render('error', {
            title: 'Error',
            error: postLookup.error,
        });
    } else if (postLookup.post.author !== userLookup.user._id.toString()) {
        res.status(401).render('error', {
            title: 'Error',
            error: 'You are not authorized to edit this class.',
        });
    } else {
        const fields = {
            id: xss(req.body['post-id']),
            title: xss(req.body['post-title']),
            content: xss(req.body['post-content']),
        };
        const result = await modifyPost(fields);
        if (result.error) {
            res.status(result.statusCode).render('error', {
                title: 'Error',
                error: result.error,
            });
        } else {
            const classLookup = await getClassById(postLookup.post.class);
            if(classLookup.error){
                const statusCode = classLookup.error;
                res.status(statusCode).render('error', {
                    title: 'Error',
                    error: classLookup.error,
                });
            }

            const classTags = classLookup.class.tags;
            let postTags = [];
            let deleteTags = [];
        
            if(!tags.includes('No tag selected')){
                classTags.forEach((tag) => {
                    if(tags.includes(tag)){
                        postTags.push(tag);
                    }
                });
            }

            if(!delTags.includes('No tag selected')){
                classTags.forEach((tag) => {
                    if(delTags.includes(tag)){
                        deleteTags.push(tag);
                    }
                });
            }

            for(let i = 0; i<postTags.length; i++){
                let result = await addTagToPost(postTags[i], id);
                if(result.error !== undefined){
                    res.status(result.statusCode).render('error', {
                        title: 'Error',
                        error: result.error,
                    });
                }
            }

            let result = await deleteTagFromPost(deleteTags, id);
            if(result.error !== undefined){
                res.status(result.statusCode).render('error', {
                    title: 'Error',
                    error: result.error,
                });
            }


            let postsUrl = req.baseUrl.slice(0, 5);
            res.redirect(`${postsUrl}/${fields.id}`);
        }
    }
});

module.exports = Router;
