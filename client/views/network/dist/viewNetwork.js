"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var react_1 = require("react");
var core_1 = require("@material-ui/core");
var semantic_ui_react_1 = require("semantic-ui-react");
var dist_1 = require("client/graphql/generated/dist");
var memberTable_1 = require("./components/memberTable");
var react_copy_to_clipboard_1 = require("react-copy-to-clipboard");
var FileCopyOutlined_1 = require("@material-ui/icons/FileCopyOutlined");
var privacyCard_1 = require("./components/privacyCard");
var Placeholder_1 = require("client/common-components/Loader/Placeholder");
var lodash_1 = require("lodash");
var zombiesTable_1 = require("./components/zombiesTable");
var JoinSteps = [
    {
        key: 'copy',
        title: 'Copy the Network ID',
        description: 'This is your VPN ID'
    },
    {
        key: 'paste',
        title: 'Paste in UAVcast-Pro',
        description: 'Paste in Zerotier VPN section'
    },
    {
        key: 'confirm',
        completed: true,
        title: 'Your Raspberry will show up here!'
    },
];
var StreamSteps = [
    {
        key: 'JoinGCS',
        title: 'Well done!',
        description: 'Download Zerotier application for your Pc or Tablet and join this network ID. When a device joins this network it will show up in the list bellow'
    },
    {
        key: 'pasteIP',
        title: 'Copy IP',
        description: 'Tick the Auth box to allow the device on this network. Copy the IP assigned for the GCS, this is the destination for your telemetry and video'
    },
    {
        key: 'start',
        title: 'Paste in UAVcast-Pro',
        description: 'Head over to UAVcast-Pro and Navigate to the ground control page and paste in the IP for your Pc / Tablet. Then enable the switch for video and telemetry.'
    },
    {
        key: 'firewall',
        title: 'GCS firewall',
        description: 'Make sure your GCS pc has port 5600 and 14550 added to the firewall rules. Open Mission Planner or QGC and it will connect automatically.'
    },
];
var ViewNetwork = function (_a) {
    var _b, _c, _d, _e, _f;
    var match = _a.match;
    var _g = react_1.useState({ copied: false, editName: false }), state = _g[0], setState = _g[1];
    var _h = react_1.useState(false), viewDeletedMembers = _h[0], setViewDeletedMembers = _h[1];
    var zombieTableRef = react_1.useRef(null);
    var _j = react_1.useState({ networkName: '', memberId: '', value: '' }), handler = _j[0], setHandler = _j[1];
    var copyNwidIntercalCleanup = react_1.useRef({});
    var _k = dist_1.useNetworkDetailsQuery({
        variables: { nwid: match.params.nwid },
        fetchPolicy: 'network-only',
        pollInterval: 15000
    }), _l = _k.data, networkDetails = (_l === void 0 ? {} : _l).networkDetails, loadingNetwork = _k.loading, loadingNetworkError = _k.error;
    var addMemberToDatabase = dist_1.useAddMemberMutation({
        refetchQueries: [{ query: dist_1.NetworkDetailsDocument, variables: { nwid: match.params.nwid } }]
    })[0];
    var updateNetwork = dist_1.useUpdateNetworkMutation()[0];
    react_1.useEffect(function () {
        return function () {
            clearTimeout(copyNwidIntercalCleanup.current);
        };
    }, []);
    var copyClipboard = function () {
        setState({ copied: true });
        copyNwidIntercalCleanup.current = setTimeout(function () {
            setState({ copied: false });
        }, 2000);
    };
    var updateNetworkHandler = function (data) {
        setState(function (prev) { return (__assign(__assign({}, prev), { editName: false })); });
        updateNetwork({
            variables: { nwid: network.nwid, data: data }
        });
    };
    var handleChange = function (e) {
        setHandler(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[e.target.name] = e.target.value, _a)));
        });
    };
    var addMember = function (nwid) {
        addMemberToDatabase({
            variables: { nwid: nwid, memberId: handler.memberId }
        }).then(function () { return setHandler(function (prev) { return (__assign(__assign({}, prev), { memberId: '' })); }); });
    };
    if (loadingNetworkError)
        return react_1["default"].createElement("div", { className: 'container text-danger text-center' }, loadingNetworkError.message);
    if (loadingNetwork) {
        return (react_1["default"].createElement(semantic_ui_react_1.Container, null,
            react_1["default"].createElement(semantic_ui_react_1.GridRow, { className: 'mt-3 mb-3' },
                react_1["default"].createElement(Placeholder_1.LoaderPlaceholder, { row: 6, lines: 5, fluid: true }))));
    }
    var network = networkDetails.network, members = networkDetails.members, zombieMembers = networkDetails.zombieMembers;
    return (react_1["default"].createElement(semantic_ui_react_1.Container, null,
        react_1["default"].createElement(semantic_ui_react_1.GridRow, { className: 'mt-3 mb-3' },
            react_1["default"].createElement(semantic_ui_react_1.Grid, null,
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { mobile: 16, computer: 8 },
                    react_1["default"].createElement(core_1.Typography, { variant: 'h6' },
                        react_1["default"].createElement("span", { className: 'text-muted' }, "Network ID:"),
                        " ",
                        network.nwid,
                        !state.copied ? (react_1["default"].createElement(react_copy_to_clipboard_1.CopyToClipboard, { text: network.nwid, onCopy: function () { return copyClipboard(); } },
                            react_1["default"].createElement("span", { style: { cursor: 'pointer', paddingLeft: 10, color: 'rgb(253 106 1)' } },
                                react_1["default"].createElement(FileCopyOutlined_1["default"], { titleAccess: 'Copy network ID' })))) : (react_1["default"].createElement("span", { style: { cursor: 'pointer', fontSize: '14px', paddingLeft: 10, color: 'green' } }, "Copied!")),
                        react_1["default"].createElement("div", null,
                            react_1["default"].createElement("span", { className: 'text-muted' }, "Network Name:"),
                            state.editName ? (react_1["default"].createElement(semantic_ui_react_1.Input, { onKeyPress: function (e) {
                                    if (e.key === 'Enter') {
                                        updateNetworkHandler({ name: handler.networkName || network.name });
                                    }
                                }, onChange: handleChange, name: 'networkName', size: 'mini', placeholder: 'network name', defaultValue: network.name })) : (react_1["default"].createElement("span", { style: { cursor: 'pointer' }, onClick: function () { return setState({ editName: true }); }, className: 'ml-1' },
                                network.name,
                                " ",
                                react_1["default"].createElement(semantic_ui_react_1.Icon, { style: { color: 'rgb(253 106 1)' }, name: 'edit outline', size: 'small', className: 'ml-3' })))),
                        react_1["default"].createElement("div", null,
                            react_1["default"].createElement("span", { className: 'text-muted' }, "Network is "),
                            ' ',
                            network.private ? react_1["default"].createElement("span", { className: 'text-success' }, "Private") : react_1["default"].createElement("span", { className: 'text-danger' }, "Public")))),
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { mobile: 8, computer: 4 },
                    react_1["default"].createElement(privacyCard_1["default"], { onClick: function () { return updateNetworkHandler({ private: true }); }, faded: !network.private, title: 'Private', color: 'green', content: 'Each user needs to be Autorization by network administrator.' })),
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { mobile: 8, computer: 4 },
                    react_1["default"].createElement(privacyCard_1["default"], { onClick: function () { return updateNetworkHandler({ private: false }); }, faded: network.private, title: 'Public', color: 'red', content: 'All users can connect to this network without Autorization' })))),
        react_1["default"].createElement(semantic_ui_react_1.GridRow, null,
            react_1["default"].createElement(semantic_ui_react_1.Grid, { className: '' },
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { mobile: 12, computer: 16, floated: 'left' },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("span", { className: 'text-muted' }, "Network Start:"),
                        " ",
                        network && ((_b = network.ipAssignmentPools[0]) === null || _b === void 0 ? void 0 : _b.ipRangeStart),
                        react_1["default"].createElement("span", { className: 'text-muted ml-5' }, "Network End:"),
                        " ",
                        network && ((_c = network.ipAssignmentPools[0]) === null || _c === void 0 ? void 0 : _c.ipRangeEnd),
                        react_1["default"].createElement("span", { className: 'text-muted ml-5' }, "Network Cidr:"),
                        " ",
                        network && ((_d = network.routes[0]) === null || _d === void 0 ? void 0 : _d.target))),
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { mobile: 16, computer: 8 },
                    react_1["default"].createElement("div", { className: '' },
                        "IPv4 Assignments ",
                        react_1["default"].createElement("small", null, "(Do not change unless you have to)")),
                    react_1["default"].createElement("div", { style: { cursor: 'pointer', fontSize: '24px', color: '#636363' } }, lodash_1.map(network.cidr, function (cidr) {
                        var _a;
                        return cidr === ((_a = network === null || network === void 0 ? void 0 : network.routes[0]) === null || _a === void 0 ? void 0 : _a.target) ? (react_1["default"].createElement("span", { style: { fontWeight: 'unset' }, key: cidr, className: 'ml-1 mr-1 badge bg-success text-dark' }, cidr)) : (react_1["default"].createElement("span", { style: { border: '1px dotted #a5a2a2', fontWeight: 'unset' }, onClick: function () { return updateNetworkHandler({ changeCidr: cidr }); }, key: cidr, className: 'ml-1 mr-1 badge bg-light text-dark' }, cidr));
                    }))))),
        react_1["default"].createElement(semantic_ui_react_1.GridRow, null,
            react_1["default"].createElement(semantic_ui_react_1.Divider, { className: 'mt-5', horizontal: true }, "Network Members")),
        react_1["default"].createElement(semantic_ui_react_1.Grid, { className: 'mb-3' },
            react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { width: 3, floated: 'left' }, members && members.length ? (react_1["default"].createElement("div", null,
                react_1["default"].createElement(core_1.Typography, { variant: 'h5' },
                    react_1["default"].createElement("div", { className: 'ui label' }, "Network Members")))) : (react_1["default"].createElement(core_1.Typography, { variant: 'h5' },
                react_1["default"].createElement("span", { className: 'ui label yellow' }, "No Members found!")))),
            react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { floated: 'right', width: 5 },
                react_1["default"].createElement("small", { className: '' }, "Devices will show up automatically, no need to refresh!")),
            react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { width: 16 }, members.length ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                react_1["default"].createElement(semantic_ui_react_1.Step.Group, { widths: 4, ordered: true, items: StreamSteps }),
                react_1["default"].createElement(memberTable_1["default"], { cidr: (_e = network === null || network === void 0 ? void 0 : network.routes[0]) === null || _e === void 0 ? void 0 : _e.target, tableData: members }))) : (react_1["default"].createElement(semantic_ui_react_1.Step.Group, { widths: 3, ordered: true, items: JoinSteps })))),
        react_1["default"].createElement(semantic_ui_react_1.GridRow, { className: 'mt-4 mb-3' },
            react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { width: 3 },
                react_1["default"].createElement(semantic_ui_react_1.Input, { action: {
                        color: 'teal',
                        labelPosition: 'left',
                        icon: 'add',
                        content: 'Add member manually',
                        onClick: function () { return addMember(network.nwid); }
                    }, value: handler.memberId, onChange: handleChange, actionPosition: 'left', placeholder: 'Device ID', name: 'memberId' }),
                react_1["default"].createElement("div", null,
                    react_1["default"].createElement(semantic_ui_react_1.Label, { pointing: true },
                        "Adds a node to this network before it joins.",
                        react_1["default"].createElement("br", null),
                        " Can be used to undelete a member."))),
            zombieMembers.length ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { width: 3, className: 'mt-5' },
                    react_1["default"].createElement(semantic_ui_react_1.Button, { icon: true, labelPosition: 'left', color: 'teal', onClick: function () {
                            setViewDeletedMembers(!viewDeletedMembers);
                            setTimeout(function () {
                                var _a;
                                (_a = zombieTableRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
                            }, 10);
                        } },
                        react_1["default"].createElement(semantic_ui_react_1.Icon, { name: 'user cancel' }),
                        "View deleted members (",
                        zombieMembers.length,
                        ")")),
                react_1["default"].createElement("div", { ref: zombieTableRef }, viewDeletedMembers ? (react_1["default"].createElement(semantic_ui_react_1.Grid.Column, { width: 16, className: 'mt-5' },
                    react_1["default"].createElement(react_1["default"].Fragment, null,
                        react_1["default"].createElement("small", null, "These members are zombies (deleted) and will be removed from the vpn controller after a while"),
                        react_1["default"].createElement("br", null),
                        react_1["default"].createElement("small", null, "You can still re-active them if you wish."),
                        react_1["default"].createElement(zombiesTable_1["default"], { cidr: (_f = network === null || network === void 0 ? void 0 : network.routes[0]) === null || _f === void 0 ? void 0 : _f.target, tableData: zombieMembers })))) : null))) : null)));
};
exports["default"] = ViewNetwork;
