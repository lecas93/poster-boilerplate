import './style.css';
import '../reporte/report-loader.css';

var data;
var table = null;

function refresh() {
    this.setState();
}

async function getUrlPlantillas() {

    console.log(table);
    console.log(localStorage.getItem('loaded_plantillas'));

    if (localStorage.getItem('loaded_plantillas') === 'true') {
        $('#loader_plantilla').hide();
        return;
    }

    console.log('CREAR TABLE');
    console.log(data);
    table = [];

    let products = data.order.products;

    for (let p in products) {
        console.log('P:', p);
        let result = await new Promise(resolve => {
            Poster.makeApiRequest('menu.getProduct?&product_id=' + products[p].id, {
                method: 'GET'
            }, (result) => {
                console.log('RESULT:', result);
                resolve(result);
            });
        });

        let product_name = result.product_name;
        let ppd = result.product_production_description;
        ppd = ppd.split(';');

        let urls = [];
        for (let _ppd in ppd) {
            let url = ppd[_ppd];
            let name = url.split('/');
            name = name[name.length - 1];
            urls.push(<a href={url}>{name}</a>);
            urls.push(<br />);
        }

        let children = [];
        children.push(<td>{product_name}</td>);
        children.push(<td>{urls}</td>);
        table.push(<tr>{children}</tr>);
    }

    console.log('FIN');

    refresh();

    localStorage.setItem('loaded_plantillas', 'true');
}

export default class Plantillas extends React.Component {
    constructor(props) {
        super(props);
        refresh = refresh.bind(this);
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        data = this.props.data;
        getUrlPlantillas();

        return (
            <div>
                <div>
                    <div id="loader_plantilla">
                        <div className="lds-facebook">Cargando...<div></div><div></div><div></div></div>
                    </div>
                </div>
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>URL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {table}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}