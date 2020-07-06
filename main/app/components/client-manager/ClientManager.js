import './style.css';
import Swal from 'sweetalert2';
import ErrorAviso from '../aviso/ErrorAviso';

let clientId;

function getClient(clientId) {
    Poster.clients.get(clientId).then((client) => {
        if (!client) {
            $('#client-nodata').show();
            return;
        }
        if (client.id !== undefined) {
            getClientInfo(client);
        } else {
            $('#client-nodata').show();
        }
    });
}

function getClientInfo(client) {
    $('#client_name').val(client.lastname + " " + client.firstname);
    $('#phone').val(client.phone);
    //$('#select_categories').val(client.groupId);
    $('#card_number').val(client.cardNumber);
    $('#email').val(client.email);
    $('#city').val(client.city);
    $('#address').val(client.address);
    $('#birthday').val(client.birthday);
    $('#comment').val(client.comment);

    $('#clientManager').show();
}

function cleanInputs() {
    $('#client_name').val('');
    $('#phone').val('');
    $('#card_number').val('');
    $('#email').val('');
    $('#city').val('');
    $('#address').val('');
    $('#birthday').val('');
    $('#comment').val('');
}

function getGroups(clientId) {
    Poster.makeApiRequest('clients.getGroups', {
        method: 'get'
    }, (groups) => {
        if (groups) {
            let select = document.getElementById('select_categories');
            while (select.firstChild) select.removeChild(select.firstChild);
            for (let i = 0; i < groups.length; i++) {
                let opt = document.createElement('option');
                opt.value = groups[i].client_groups_id;
                opt.innerHTML = groups[i].client_groups_name;
                select.appendChild(opt);
            }
        }
        getClient(clientId);
        if (localStorage.getItem('auth') === '0') {
            $('#select_categories').prop('disabled', false);
        } else {
            $('#select_categories').prop('disabled', true);
        }
    });
}

function saveClientInfo() {
    $("#btnGuardar").prop('disabled', true);
    Poster.makeApiRequest('clients.updateClient', {
        method: 'post',
        data: {
            client_id: clientId,
            client_name: $('#client_name').val(),
            //client_groups_id_client: $('#select_categories').val(),
            card_number: $('#card_number').val(),
            phone: $('#phone').val(),
            email: $('#email').val(),
            birthday: $('#birthday').val(),
            city: $('#city').val(),
            address: $('#address').val(),
            comment: $('#comment').val()
        },
    }, (result) => {
        if (result === clientId) {
            cleanInputs();
            showNotification('success', '¡Cambios guardados con éxito!');
        } else {
            showNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
        }
    });
}

function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            $("#btnGuardar").prop('disabled', false);
            if (type === 'success' || needclose === true) Poster.interface.closePopup();
        }
    });
}

function init() {
    $('#client-nodata').hide();
    $('#clientManager').hide();
}

class ClientManager extends React.Component {

    constructor(props) {
        super(props);
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        clientId = this.props.clientId;
        if (clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        init();
        //getGroups(clientId);
        getClient(clientId);
        return (
            <div>
                <div id="client-nodata" hidden>
                    <h2>Opss...</h2>
                    <h3>No se ha podido obtener la información del cliente. Por favor, intente de nuevo.</h3>
                </div>
                <div className="clientManager" id="clientManager" hidden>
                    <div className='scrollable-client'>
                        <div className='sub-wrapper-client'>
                            <p>Nombre:</p>
                            <input type="text" defaultValue="" id="client_name" placeholder="Nombre y apellido" />
                        </div>
                        <div className='sub-wrapper-client'>
                            <p>Teléfono:</p>
                            <input type="text" id="phone" defaultValue="" placeholder="Número telefónico" />
                        </div>
                        {/*<div className='sub-wrapper-client'>
                            <p>Categoría:</p>
                            <select class="form-control" id='select_categories'>
                            </select>
                        </div>*/}
                        <div className='sub-wrapper-client'>
                            <p>Número de tarjeta:</p>
                            <input type="text" id="card_number" defaultValue="" placeholder="Número de tarjeta de crédito o débito" />
                        </div>
                        <div className='sub-wrapper-client'>
                            <p>Email:</p>
                            <input type="text" id="email" defaultValue="" placeholder="ejemplo@gmail.com" />
                        </div>
                        <div className='sub-wrapper-client'>
                            <p>Ciudad:</p>
                            <input type="text" id="city" defaultValue="" />
                        </div>
                        <div className='sub-wrapper-client'>
                            <p>Dirección:</p>
                            <input type="text" id="address" defaultValue="" />
                        </div>
                        <div className='sub-wrapper-client'>
                            <p>Fecha de nacimiento:</p>
                            <input type="date" id="birthday" defaultValue="aaaa-mm-dd" />
                        </div>
                        <div className='client_comment'>
                            <p>Comentarios:</p>
                            <textarea id="comment" rows="2"></textarea>
                        </div>
                    </div>
                    <br />
                    <button className="btn btn-green" id="btnGuardar" onClick={saveClientInfo}>Guardar</button>
                </div>
            </div>
        );
    }
}

export default ClientManager;