var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var nameUsed = [];
var currentRoom ={};

console.log('guestNumber:'+ guestNumber)

exports.listen = function(server) {
    io = socketio.listen(server);
    io.set('log leverl', 1);
    io.sockets.on('connection',function(socket){
      
        console.log('connection')
        console.log(socket.id)
        
        guestNumber = assingGuestName(socket, guestNumber,nickNames, nameUsed);
        joinRoom(socket, "Lobby");
        handleMessageBroadCasting(socket ,nickNames);
        handleNameChangeAttempts(socket, nickNames, nameUsed);
        handleRoomJoining(socket);
        socket.on('room',function(){
            socket.emit('rooms',io.of('/').adapter.rooms);
        })
        handleClientDisconnection(socket, nickNames, nameUsed);
    })
}

function assingGuestName(socket, guestNumber, nickNames, nameUsed) {
    console.log('assingGuestName')
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult',{
        success:true,
        name:name
    })
    nameUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    console.log('socket.id',socket.id)
    console.log('joinRoom')
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room:room});
    socket.broadcast.to(room).emit('message',{
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    })

    // var usersInRoom = io.of('/').in(room).clients;
    // var usersInRoom = Object.keys(socket.rooms)
    // var usersInRoom = Object.keys(socket[room])
    // 
    var usersInRoom = io.sockets.adapter.rooms[room];
    console.log(usersInRoom.sockets);

    console.log("usersInRoom:",usersInRoom)
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ':';
        for (var index in usersInRoom.sockets) {
            var userSocketId = index;
            if (userSocketId != socket.id) {
                if (index > 0 ) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }

        }
        usersInRoomSummary += '.';
        socket.emit('message',{text:usersInRoomSummary})
    }
}

function handleNameChangeAttempts(socket,nickNames, nameUsed) {
 
    socket.on('nameAttempt',function(name){
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult',{
                success:false,
                message:'Name cannot begin with "Guest"'
            });
        } else {
            if (nameUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = nameUsed.indexOf(previousName);
                nameUsed.push(name);
                nickNames[socket.id] = name;
                delete nameUsed[previousNameIndex];
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                console.log(name)
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName + ' is now known as' + name + '.'
                })
            } else {
                socket.emit('nameResult',{
                    success:false,
                    message:"That name is already in use."
                })
            }
        }
    })
}

function handleMessageBroadCasting(socket) {
    socket.on('message',function(message){
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id] + ": " + message.text
        })
    })
}


function handleRoomJoining(socket) {
    socket.on('join',function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom)
    })
}

function handleClientDisconnection(socket) {
    socket.on('disconnect',function(){
        var nameIndex = nameUsed.indexOf(nickNames[socket.id]);
        delete nameUsed[nameIndex];
        delete nickNames[socket.id];
    })
}