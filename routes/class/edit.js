const e = require('express');
const {
    getClassById,
    modifyClass,
    addTagToClass,
} = require('../../data/classes');
const { getUserByToken } = require('../../data/users');
const Router = e.Router();
const xss = require('xss');

Router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const userLookup = await getUserByToken(req.session.token);
    const classLookup = await getClassById(id);
    if (userLookup.error) {
        res.status(userLookup.statusCode).render('error', {
            title: 'Error',
            error: userLookup.error,
            loggedIn: req.session.token ? true : false,
        });
    } else if (classLookup.error) {
        res.status(classLookup.statusCode).render('error', {
            title: 'Error',
            error: classLookup.error,
            loggedIn: req.session.token ? true : false,
        });
    } else if (
        classLookup.class.instructor !== userLookup.user._id.toString()
    ) {
        res.status(401).render('error', {
            title: 'Error',
            error: 'You are not authorized to edit this class.',
            loggedIn: req.session.token ? true : false,
        });
    } else {
        res.render('edit_class', {
            title: `Edit ${classLookup.class.name}`,
            class: classLookup.class,
            tags: classLookup.class.tags ? classLookup.class.tags.join(' | ') : undefined,
            loggedIn: req.session.token ? true : false,
        });
    }
});

Router.post('/', async (req, res) => {
    const id = xss(req.body['class-id']);
    const userLookup = await getUserByToken(req.session.token);
    const classLookup = await getClassById(id);
    if (userLookup.error) {
        res.status(userLookup.statusCode).render('error', {
            title: 'Error',
            error: userLookup.error,
        });
    } else if (classLookup.error) {
        res.status(classLookup.statusCode).render('error', {
            title: 'Error',
            error: classLookup.error,
        });
    } else if (
        classLookup.class.instructor !== userLookup.user._id.toString()
    ) {
        res.status(401).render('error', {
            title: 'Error',
            error: 'You are not authorized to edit this class.',
        });
    } else {
        const fields = {
            name: xss(req.body['class-name']),
            description: xss(req.body['class-description']),
            code: xss(req.body['class-code']),
            password: xss(req.body['class-password']),
            id: xss(req.body['class-id']),
        };
        const result = await modifyClass(fields);
        if (result.error) {
            res.status(result.statusCode).render('error', {
                title: 'Error',
                error: result.error,
            });
        } else {
            res.redirect(`${req.baseUrl}/${fields.id}`);
        }
    }
});

Router.post('/tags', async (req, res) => {
    const tag = xss(req.body['tag-name']);
    const id = xss(req.body['class-id']);
    const userLookup = await getUserByToken(req.session.token);
    const classLookup = await getClassById(id);
    if (userLookup.error) {
        res.status(userLookup.statusCode).render('error', {
            title: 'Error',
            error: userLookup.error,
        });
    } else if (classLookup.error) {
        res.status(classLookup.statusCode).render('error', {
            title: 'Error',
            error: classLookup.error,
        });
    } else if (
        classLookup.class.instructor !== userLookup.user._id.toString()
    ) {
        res.status(401).render('error', {
            title: 'Error',
            error: 'You are not authorized to edit this class.',
        });
    } else {
        let allTags = tag.split(',');
        for(let i = 0; i < allTags.length; i++){
            allTags[i] = allTags[i].trim();
        }
        const result = await addTagToClass({ tag: allTags, classID: id });
        if (result.error) {
            res.status(result.statusCode).render('error', {
                title: 'Error',
                error: result.error,
            });
        } else {
            res.redirect(`${req.baseUrl}/${id}`);
        }
    }
});

module.exports = Router;
