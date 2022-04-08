const express = require("express");
const app = express();
const path = require("path");
const port = 3000;
const fs = require('fs');
const sessions = require("express-session");
const mongoose = require("mongoose");
const mongodbSession = require("connect-mongodb-session")(sessions);
const mongoUri = "mongodb://localhost:27017/Sample";
const User = require("../db/models/UserModel");
const Post = require("../db/models/PostModel");
const bcrypt = require("bcryptjs");
var multer = require("multer");

// Javascript Fuctions 
function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}


//express related stuff
app.use('/static',express.static('static'));
app.use(express.urlencoded({extended:false}));

const store = new mongodbSession({
    uri:mongoUri,
    collection:"mySessions"
});

app.use(sessions({
    secret:'key that sign cookie',
    resave:false,
    saveUninitialized:false,
    store:store
}));



//set view Engine PUG
app.set('view engine','pug');
app.set('views',path.join(__dirname,'../views'));

//Database Connection
mongoose.connect(mongoUri,{useNewUrlParser:true,useUnifiedTopology:true})
.then(console.log("Connection Succesfull"))
.catch((error)=>console.log(console.log(error)));


//middlewares
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname + '/../uploads'))
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
  
var upload = multer({ storage: storage });

const isAuth =(req,res,next)=>{
    if(req.session.isAuth)
        next()
    else{
        res.redirect('/login');
    }
}

//end points(routing)
app.get("/",(req,res)=>{       
   res.status(200).render("index.pug"); 
});

app.get('/register',(req,res)=>{       

   res.status(200).render("register.pug"); 
});

app.post('/register',upload.single('img'),async (req,res)=>{
   const {username,email,password,birthday,gender} = req.body;
   const imgName = req.file.filename;
    let user = await User.findOne({email});
    console.log(req.file);
    if(user){
        res.redirect("register.pug");
    }
    const hashpass = await bcrypt.hash(password,10);
    user = new User({
        username,
        email,
        password:hashpass,
        birthday,
        gender,
        img:imgName,    
    });

    await user.save();

   res.redirect("login"); 
});

app.get('/login',(req,res)=>{       
   res.status(200).render("login.pug"); 
});

app.get('/home',isAuth,(req,res)=>{
   res.status(200).render("home.pug",{username:req.session.username}); 
});

app.get('/search',isAuth,(req,res)=>{
   res.status(200).render("search.pug",{username:req.session.username}); 
});

app.get('/messages',isAuth,(req,res)=>{
   res.status(200).render("messages.pug",{username:req.session.username}); 
});
app.get('/post',isAuth,(req,res)=>{
   res.status(200).render("post.pug",{username:req.session.username}); 
});
app.post('/post',upload.single('img'),async (req,res)=>{
   const {location,caption} = req.body;
   const imgName = req.file.filename;
    let post ;
    console.log(req.file);
   
    post = new Post({
        location,
        caption,
        userId:req.session.userId,
        likes:0,
        img:imgName    
    });

    await post.save();

   res.redirect("profile"); 
});

app.get('/profile',isAuth,async(req,res)=>{ 
   const id = req.session.userId;
   const user = await User.findOne({_id:id});
   const age = getAge(user.birthday);       
   const param = {
       username:user.username,
       bio:user.bio,
       posts:user.posts,
       friends:user.friends,
       age:age,
       gender:user.gender
   }
   res.status(200).render("profile.pug",param); 
});



app.post('/login',async(req,res)=>{
    const {email,password} = req.body;
    let user = await User.findOne({email});
    if(!user){
        console.log("email not found in database ");
    }
    //const enter = 
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
        console.log("Wrong Pass");
    }
    else{
        req.session.isAuth = true;
        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect("home");
    }
});

app.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        
        res.redirect("/");
    });
});


//Listen
app.listen(port,()=>{
    console.log(` app listening at http://localhost:${port}`);
});
