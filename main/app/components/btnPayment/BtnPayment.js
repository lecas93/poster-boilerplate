import './style.css';

import FacturePlugin from '../factura/FacturePlugin';

let data;

export default class BtnPayment extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        data = this.props.data;
        return (
            <div>
                <FacturePlugin data={data} />
            </div>
        );
    }
}