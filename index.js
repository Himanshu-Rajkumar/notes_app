const express = require('express');
const app = express();
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const env=require('dotenv').config()
const cors = require('cors');
app.use(cors());


const PORT = process.env.PORT || 8080 ;
// Middle ware
app.use(express.json());


// Connect mongoose to our Express server
const connectdb = () => { mongoose.connect(process.env.MONGOOSE_URL) }

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
})

const userModel = mongoose.model("user", userSchema)

// Notes module

const noteSchema= new mongoose.Schema({
  title:{type:String ,require:true},
  description:{type : String , require: true},
  userId:{type:String},
  userName:{type:String},
  date:{type:Date , default:Date.now}
},{
  versionKey:false
})

const noteModel =mongoose.model("note",noteSchema)


// User registration
app.post('/register', async (req, res) => {
  const { name, role, email, password } = req.body;
  const user = await userModel.findOne({ email });

  try {

    if (user) {
      return res.send('User is already registered')
    }
    else {
      bcrypt.hash(password, 2, async (err, hashedPassword) => {

        const newUser = new userModel({
          name,
          email,
          password: hashedPassword,
          role,
        })
        await userModel.create(newUser);

      })


      return res.send("User registered sucessfully")
    }
  } catch (error) {
    return res.send({ message: error.message })
  }

})

// User Login

app.post('/login', async (req, res) => {
 const {email,password}=req.body;
 const user=await userModel.findOne({email});

 if(user){
  bcrypt.compare(password,user.password,async(err,result)=>{
    try {
      if(result){
        var token=jwt.sign({UserId:user._id, userName:user.name},process.env.JWT_SECRET);  // token generation
        return res.status(200).send({message:"Logged in successfully", token:token});
      }
      else{
        return res.status(400).send(err.message);
      }
      
    } catch (error) {
      return res.status(400).send({message: error.message});
    }
  })
 }
})

// middleware

const authMiddleware = ((req, res, next) => {
  const token = req.headers.authorisation;
  jwt.verify(token, "masai", function (err, decoded) {
    if (err) {
      return res.status(500).send('You are not allowed to access it')
    }
    else {
      req.body.UserId=decoded.UserId;
      req.body.userName=decoded.userName;
      next();

    }
  })
})





// report

app.get('/',  async (req, res) => {

  try {
    res.status(201).send('Hello')
  } catch (error) {
    console.log({ error: error.message })
  }
})


//  POST Request
app.post("/addNote",authMiddleware, async (req, res) => {
  const {title,description,userId,userName} = req.body;

  try {
    await noteModel.create({title,description,userId,userName});
    res.status(200).send("notes added successfully");
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});


// Put Request
app.put("/updateNote/:id",authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updateNote = req.body;

  try {
    const update = await noteModel.findByIdAndUpdate(id, updateNote, {
      new: true, // Return updated user
    });

    if (!updateNote) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send({ message: "Note updated", note: updateNote });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Delet Request

app.delete("/deleteNote/:id",authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const deleteNote = await noteModel.findByIdAndDelete(id);

    if (!deleteNote) {
      return res.status(404).send({ message: "note not found" });
    }

    res.status(200).send({ message: "note deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});





app.listen(PORT, async () => {
  try {
    await connectdb()
    console.log(`Server running on the port ${PORT}`)
    console.log('Connected to database')
  } catch (error) {
    console.error(error)

  }

})

// 