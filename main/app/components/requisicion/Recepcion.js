import './style.css';

function reciveRequisitionProduct() {
    if (barCode !== null || barCode !== undefined) {
        var barCode = document.getElementById("inputBarCode").value;
        barCode = barCode.split("-");

        if (barCode.length == 1) {
            let envio = barCode[0].substring(0,7);
            let producto = barCode[0].substring(8,11);
            barCode[0] = envio;
            barCode[1] = producto;
        }
        var data = {
            'asesor': localStorage.getItem("asesor_activo"),
            'sucursal': Poster.settings.spotId,
            'envio': parseInt(barCode[0]),
            'producto': parseInt(barCode[1])
        };

        $.ajax({
            type: 'POST',
            url: 'url/Requisiciones/recive_envio_product',
            data: data,
            dataType: 'json',
            encode: true
        })
        .done(function (data) {

            var response = document.getElementById('response');
            response.innerHTML = data.message;

            var input = document.getElementById('inputBarCode');
            input.value = '';

            var send = document.getElementById('sendBarCode');
            send.disabled = true;

            if (data.status != 0){
                addProducto(data.product);
            }
        })
    }
}

function addProducto (producto) {
    let productos = document.getElementById('receptionBody');

    let tr = document.createElement('tr');

    let id = document.createElement('td');
    id.innerHTML = producto.envio + "-" + producto.producto;

    let name = document.createElement('td');
    name.innerHTML = producto.product;

    let cant = document.createElement('td');
    cant.innerHTML = producto.cantidad;

    tr.appendChild(id);
    tr.appendChild(name);
    tr.appendChild(cant);

    productos.prepend(tr);
}

function setEvents() {
    var reception = document.getElementById("receptionBody");
    reception.innerHTML = "";
    var input = document.getElementById("inputBarCode");

    input.onkeydown = process_key;
    input.onkeyup = process_result;

    var send = document.getElementById("sendBarCode");

    send.onclick = reciveRequisitionProduct;
}

function process_key(event) {

    var isControlKey = process_control(event);
/*
    if (isControlKey) {
        return false;
    }*/

    var isValueKey = process_value(event);

    return isValueKey;
}

function process_control(event) {
    let send = document.getElementById("sendBarCode");
    let input = document.getElementById("inputBarCode");
    var response = document.getElementById('response');
    let keycode = event.keyCode;

    if (keycode == 13) { // Enter
        event.preventDefault();
        //process_result(event);
        if (send.disabled) {
            input.value = "";
            response.innerHTML = "El formato del codigo insertado no es el correcto";
        } else {
            send.click();
        }
        return true;
    }

    if (event.shiftKey) {
        return true;
    }

    let isControlKey =
        (keycode > 0 && keycode < 8) ||
        (keycode > 8 && keycode < 37) ||
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
        (keycode > 47 && keycode < 58) || // number keys
        (keycode > 95 && keycode < 106) || // numpad keys
        (keycode == 189);

    return valid;
}

function process_result(event) {
    var send = document.getElementById("sendBarCode");
    // match numbers and letters for barcode
    let input = event.target.value;
    console.log(input);
    if (event.target.value.match(/(([0-9]+((-){1}[0-9]+))|(^[0-9]{7}((\S)?[0-9]{3}))$)/)) {
        send.disabled = false;
    } else {
        send.disabled = true;
    }
}

export default class Recepcion extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        setEvents();
        $('#inputBarCode').focus();
    }

    render() {

        return (
            <div>
                <div>
                    <div className="row">
                        <div className="col-sm-12" id="headRequisicion">
                            <h2>Recepcion de insumos y productos</h2>
                        </div>
                    </div>
                    <br />
                    <br />
                    <div className="row scrollable-requisicion">
                        <div className="col-sm-12">
                            <table>
                                <thead>
                                    <tr>
                                        <th>numero de control</th>
                                        <th>producto</th>
                                        <th>cantidad</th>
                                    </tr>
                                </thead>
                                <tbody id="receptionBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <br />
                    <div className="row">
                        <div className="col-sm-4">
                            <input type="text" id="inputBarCode"/>
                        </div>
                        <div className="col-sm-4">
                            <button className="btn btn-green" id="sendBarCode" disabled="true">Recibir</button>
                        </div>
                        <div className="col-sm-4">
                            <p id="response"></p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
