import './style.css';
import Swal from 'sweetalert2';

let trelloKey = 'trello key';
let trelloToken = 'trello token';

let destinationBoard = [];
destinationBoard[1] = 'id list a';
destinationBoard[2] = 'id list b';
destinationBoard[5] = 'id list c';

var list = "TERMINADOS";
var destination = "ENTREGADOS";

var boardLists = [];
var orders;
var result;

var sucursal;

function getSucursal() {
    Poster.makeApiRequest('access.getSpots', {
        method: 'get'
    }, (result) => {
        if (result) {
            result.forEach((item) => {
                if (Poster.settings.spotId === Number(item.spot_id)) {
                    sucursal = item.spot_id;
                    getSucursalBoardLists();
                    return;
                }
            });
        }
    });
}

function getSucursalBoardLists () {

    let data = {
        "cards"         : "none",
        "card_fields"   : "all",
        "filter"        : "open",
        "fields"        : "id,name",
        "key"           : trelloKey,
        "token"         : trelloToken
    }; 

    $.ajax({
        type: 'GET',
        url: 'https://api.trello.com/1/boards/'+ destinationBoard[sucursal]+'/lists',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) {
        let name;
        for (var i = 0; i < data.length; i++) {
            name = data[i].name;

            if (name == list) {
                boardLists[list] = data[i].id;
            }
            if (name == destination) {
                boardLists[destination] = data[i].id;
            }
        }

        getSucursalBoardListCards(list);
    })
    .fail(function(xhr, textStatus, errorThrown) {
        alert(xhr.responseText);
    });
}

function getSucursalBoardListCards (name) {

    let data = {
        "card_fields"   : "id,name",
        "key"           : trelloKey,
        "token"         : trelloToken
    };

    $.ajax({
        type: 'GET',
        url: 'https://api.trello.com/1/lists/'+ boardLists[name]+'/cards',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) {
        createSucursalBoardListCards(name,data);
    })
    .fail(function(xhr, textStatus, errorThrown) {
        alert(xhr.responseText);
    });
}

function createSucursalBoardListCards(name, cards) {
    orders = [];
    if (name == list) {
        name = "finished";
    }

    var finished = document.getElementById(name);
    finished.innerHTML = "";

    let numberOfCards = cards.length;
    let card;
    for (let i = 0; i < numberOfCards; i++) {
        card = create_order_card (cards[i].id,cards[i].name,cards[i].desc);
        finished.appendChild(card);

        orders[i] = {id:cards[i].id,text:card.title.toLowerCase()};
    }
}

function create_order_card (id, title, description) {
    var card = document.createElement('div');
    card.title = title;
    card.style.backgroundColor = "white";
    card.className = "card";
    card.id = id;
    
    var head = create_order_card_head (title);
    
    var body = create_order_card_body (id,description);
    
    card.appendChild(head);
    card.appendChild(body);
    
    return card;
}

function create_order_card_head (title) {
    
    var head = document.createElement('h5');
    head.className = "card-header";
    head.innerText = title;
    
    return head;
}

function create_order_card_body (id, description) {
    var body = document.createElement('div');
    body.className = "card-body";
    /*
    var text = document.createElement('p');
    text.className = "card-text";
    text.innerHTML = description;
    */
    var button = document.createElement('button');
    button.id = "send"+id;
    button.className = "btn btn-primary";
    button.setAttribute("type", "button");
    button.onclick = function() {deliver_order(id)};
    button.innerText = "Entregar";
    body.appendChild(button);
    
    //body.appendChild(text);
    
    return body;
}

function send_order_to_delivery(input) {
    let orderId = find_order_id(input.value);

    if (!!orderId) {
        deliver_order(orderId,input);
    }
}

function deliver_order (id, input) {
    let data = {
        "idList"   : boardLists[destination],
        "key"           : trelloKey,
        "token"         : trelloToken
    };

    $.ajax({
        type: 'PUT',
        url: 'https://api.trello.com/1/cards/'+ id,
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) {
        //let finished = document.getElementById("finished");
        //let card = document.getElementById(id);

        //finished.removeChild(card);
        if (!!input) {
            input.value = "";
        }
        getSucursalBoardListCards(list);
    })
    .fail(function(xhr, textStatus, errorThrown) {
        alert("No se pudo realizar la peticion, hubo un error de red");
    });
}

function set_filter_button () {
    let inputFilter = document.getElementById('filterFinishedOrders');
    inputFilter.onkeydown = process_key;
    inputFilter.oninput = filter_orders;
}

function process_key(event) {
    var isControlKey = process_control(event);
    if (isControlKey) {
        return false;
    }

    var isValueKey = process_value(event);
    return isValueKey;
}

function process_control(event) {
    var keycode = event.keyCode;

    if (keycode == 13) { // Enter
        event.preventDefault();
        send_order_to_delivery(event.target);
        return true;
    }

    if (event.shiftKey) {
        return true;
    }

    var isControlKey =
        (keycode > 0 && keycode < 8) ||
        (keycode > 8 && keycode < 32) ||
        (keycode > 32 && keycode < 37) ||
        (keycode > 40 && keycode < 47) ||
        (keycode > 57 && keycode < 64) ||
        (keycode > 90 && keycode < 95) ||
        (keycode > 106 && keycode < 189) ||
        (keycode > 189);

    return isControlKey;
}

function process_value(event) {
    var keycode = event.keyCode;

    var valid =
        (keycode == 8) || // backspace
        (keycode == 32) || // space
        (keycode > 36 && keycode < 41) || // d-pad keys
        (keycode > 64 && keycode < 91) || // alpha keys
        (keycode > 47 && keycode < 58) || // number keys
        (keycode > 95 && keycode < 106) || // numpad keys
        (keycode == 189);

    return valid;
}

function find_order_id(input){
    let filter = input.toLowerCase();
    result = [];

    if (filter == ""){
        return "";
    }

    let i,n;
    for ( i = 0, n = orders.length; i < n; i++) {
        filter_order(filter, orders[i]);
    }

    if (result.length == 1) {
        return result[0].id;
    }

    return "";
}

function filter_orders(){
    let filter = this.value.toLowerCase();
    result = [];

    if (filter == ""){
        show_all_order_cards();
        return;
    }

    let i,n;
    for ( i = 0, n = orders.length; i < n; i++) {
        filter_order(filter, orders[i]);
    }
    return;
}

function filter_order(params, data) {
    if (data.text.indexOf(params) > -1) {
      $("#"+data.id).show();
      result.push(data);
      return true;
    }

    $("#"+data.id).hide();
    return false;
}

function show_all_order_cards() {
    let i,n;

    for ( i = 0, n = orders.length; i < n; i++) {
        $("#"+orders[i].id).show();
    }
    
    result = orders;
}

export default class Recepcion extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        getSucursal();
        set_filter_button();
        $('#filterFinishedOrders').focus();
    }

    render() { 

        return (
            <div>
                <div>
                    <div className="row">
                        <div className="col-sm-9">
                            <h2>Manejo Ordenes</h2>
                        </div>
                    </div>
                    <br />
                    <div className="row">
                        <div className="col-sm-1 col-md-2"></div>
                        <div className="col-sm-10 col-md-8">
                            <input type="text" className='form-control' id='filterFinishedOrders'></input>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-1 col-md-2"></div>
                        <div className="col-sm-10 col-md-8">
                            <h4>TERMINADOS</h4>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-1 col-md-2"></div>
                        <div className="col-sm-10 col-md-8" id="finished">

                        </div>
                    </div>
                </div>
            </div>
        );
    }
}