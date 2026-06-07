require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;
app.get('/' , (req, res) => {
    res.json({message : 'PrepSense API live'});
});
app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));