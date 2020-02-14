# VM

This is a vain attempt to document the how the underlying machine of TBN works.
As you might have noticed the VM is garbage and will stay that way until hell freezes over.
The architecture of the VM is essentially a horrible version of the Erlang runtime VM.

## Fundamnentals

The VM evaluates basic machine instructions organized into processes containing modules that contains functions.
The VM also implements a pretty naive round robin method of preemptive task switching. Interprocess
communication is implemented via message sending between self contained processes. Like in Erlang all
messages are copied and will never send references. All processes are entirely self contained
and never shares any memory.

Each process also holds its own set of code modules. Each process can independently load and reload modules.

The memory model of the VM is pretty fucking naive to say the least. Each stack frame has access to its own
self contained memory, apart from arrays everything is pass by value. Even tho array references are passed
around they should be treated as being pass by values. Implementing semantically pass by value behavior for arrays
and other objects is to be implemented.

Each process has its own randomly generated PID which identifies the process and facilitates message sharing.
PID `0` is magic and is the PID of the I/O functionality. PID `0` is not a process at all and only handles input and
output. There is no semantically difference from a process perspective between sending a message to pid `0` and one to
any other pid.

### Message passing

Messages are handled essentially the same as in erlang with some exceptions.
To send a message you'll need to know the pid of the dude to which to send.
The payload of a message is simply just an array of values. All values will be copied (even arrays) so no memory will be shared.

The message will contain an automatically generated reference id, the payload, the pid of the sender and recipient and an optional
`require_response` parameter and an optional `response_id` parameter.

There are fundamentally two kinds of message sends, simple sends and requests. The big difference is that
a request is blocking. The sending process will not continue execution until it has received a response to that specific message,
barring timeouts. Any other messages received whilst waiting for a response will be ignored but remain on the message queue.

To receive messages a process must enter a listening state. This is done by registering a listening handler function. This function
will receive the following arguments on a message: the senders pid, and the payload array. If the received message has the `require_response`
flag set the thingy returned by the function will be sent as a response to the requester dude.
