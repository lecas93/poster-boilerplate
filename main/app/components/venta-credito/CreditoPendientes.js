import './style.css';
import './lds-roller.css';
import './sk-cube.css';
import ErrorAviso from '../aviso/ErrorAviso';
import Swal from 'sweetalert2';
import PagosManager from '../util/PagosManager';

let _PagosManager = null;

let clientId;
let ventasCredito;

let tableCreditos = null;

function refresh() {
    this.setState();
}

function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }

        $('#client').text(client.lastname + ' ' + client.firstname + ' ' + client.patronymic);
        localStorage.setItem('client', $('#client').text());
    });
}

function showPagosManager(num_ticket, _monto) {
    console.log(num_ticket);
    $('#divSelectCreditos').hide();
    $('#divTable').hide();
    _PagosManager = <PagosManager tipo="credito" numTicket={num_ticket} monto={_monto} />;
    $('#divPagosManager').show();
    refresh();
}

function getCreditosCliente() {
    let status = $('select[id=selectCreditos] option:selected').val();
    console.log('status:', status);
    if (status === '-1') return;
    $('#creditosLoader').show();
    $('#divTable').hide();
    Poster.makeRequest('url/creditos_cliente.php', {
        headers: [],
        method: 'POST',
        data: {
            client_id: clientId,
            estado: status
        },
        timeout: 10000
    }, (answer) => {
        console.log('respuesta:', answer);
        if (Number(answer.code) === 200) {
            ventasCredito = JSON.parse(answer.result);
            console.log(ventasCredito);
            tableCreditos = createTable();
            //this.state.currentTable = createTable();
        } else {
            showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
        }
        refresh();
        $('#creditosLoader').hide();
        $('#divTable').show();
    });
}

function createTable() {
    let table = [];

    table.push(
        <thead>
            <tr>
                <th># Ticket</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Action</th>
            </tr>
        </thead>
    );

    let num_orders = ventasCredito.length;
    if (num_orders !== 0) {
        for (let i = 0; i < num_orders; i++) {
            let children = [];
            children.push(<td>{ventasCredito[i].num_ticket}</td>);
            children.push(<td>${ventasCredito[i].monto}</td>);
            children.push(<td>{(ventasCredito[i].pagado === '0' ? 'No pagado' : 'Pagado')}</td>);
            children.push(<td><button className="btn btn-success" onClick={() => showPagosManager(ventasCredito[i].num_ticket, ventasCredito[i].monto)}>Gestionar</button></td>);
            table.push(<tr>{children}</tr>);
        }
    }

    return table;
}

function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

export default class CreditoPendientes extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentTable: null
        };

        console.log('version de react:', React.version);

        refresh = refresh.bind(this);
        getCreditosCliente = getCreditosCliente.bind(this);

        /*
        Poster.on('afterPopupClosed', () => {
            console.log(localStorage.getItem('ultimaUbicacion'));
            if (localStorage.getItem('ultimaUbicacion') === 'CreditosPendientes') {
                console.log('POPU CERRADO DESDE CREDITOS PENDIENTES');
                console.log(tableCreditos);
                //alert("Popup closed");
                //
                Poster.interface.showNotification({
                    title: 'Online order',
                    message: 'New order on 5th table',
                    icon: 'https://joinposter.com/upload/apps/icons/posterboss-ios.png',
                }).then((notification) => {
                    console.log('new notification', notification);
                });
                //
                $('#selectCreditos').val('-1');
                $('#divSelectCreditos').show();
                $('#creditosLoader').hide();
                $('#divTable').hide();
                $('#divPagosManager').hide();

                localStorage.setItem('ultimaUbicacion', 'POS');
                localStorage.setItem('alreadyLoaded', 'false');
                location.reload();
            }
        });
        */
    }

    render() {
        clientId = this.props.clientId;

        if (clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        localStorage.setItem('alreadyLoaded', 'false');
        getClient(clientId);
        //init();

        return (
            <div>
                <div className="row">
                    <div className="col-sm-3">
                        <img src="url logo" alt="imagen" className="img-thumbnail img-responsive center-block" />
                    </div>
                    <div className="col-sm-9">
                        <h2>Ventas a crédito</h2>
                        <h3>Cliente: <p id="client"></p></h3>
                    </div>
                </div>
                <br />
                <div className="row" id="divSelectCreditos">
                    <div className="col-sm-12">
                        Mostrar:
                        <select className="form-control" onChange={getCreditosCliente} id="selectCreditos">
                            <option value="-1">Seleccione una opción</option>
                            <option value="0">No pagados</option>
                            <option value="1">Pagados</option>
                            <option value="2">Todos</option>
                        </select>
                    </div>
                </div>
                <div id="creditosLoader" hidden>
                    <div className="sk-cube-grid">
                        <div className="sk-cube sk-cube1"></div>
                        <div className="sk-cube sk-cube2"></div>
                        <div className="sk-cube sk-cube3"></div>
                        <div className="sk-cube sk-cube4"></div>
                        <div className="sk-cube sk-cube5"></div>
                        <div className="sk-cube sk-cube6"></div>
                        <div className="sk-cube sk-cube7"></div>
                        <div className="sk-cube sk-cube8"></div>
                        <div className="sk-cube sk-cube9"></div>
                    </div>
                </div>
                <br />
                <div className="row scrollable-creditos">
                    <div className="col-sm-12">
                        <div id="divTable" hidden>
                            <table id="tableCreditos">
                                {tableCreditos}
                            </table>
                        </div>
                        <div id="divPagosManager" hidden>
                            {_PagosManager}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}