/*
 * A JavaScript class based model for the ZeroTier controller microservice API
 * Copyright (C) 2011-2017  ZeroTier, Inc.  https://www.zerotier.com/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * --
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial closed-source software that incorporates or links
 * directly against ZeroTier software without disclosing the source code
 * of your own application.
 */

'use strict';

/**
 * @param {string} IP with optional /netmask|port section
 * @return 4, 6, or 0 if invalid
 */
function ipClassify(ip)
{
	if ((!ip)||(typeof ip !== 'string'))
		return 0;
	let ips = ip.split('/');
	if (ips.length > 0) {
		if (ips.length > 1) {
			if (ips[1].length === 0)
				return 0;
			for(let i=0;i<ips[1].length;++i) {
				if ('0123456789'.indexOf(ips[1].charAt(i)) < 0)
					return 0;
			}
		}
		if (ips[0].indexOf(':') > 0) {
			for(let i=0;i<ips[0].length;++i) {
				if ('0123456789abcdefABCDEF:'.indexOf(ips[0].charAt(i)) < 0)
					return 0;
			}
			return 6;
		} else if (ips[0].indexOf('.') > 0) {
			for(let i=0;i<ips[0].length;++i) {
				if ('0123456789.'.indexOf(ips[0].charAt(i)) < 0)
					return 0;
			}
			return 4;
		}
	}
	return 0;
}
exports.ipClassify = ipClassify;

/**
 * Make sure a string is lower case hex and optionally left pad
 *
 * @param x {string} String to format/canonicalize
 * @param l {number} Length of desired string or 0/null to not left pad
 * @return Padded string
 */
function formatZeroTierIdentifier(x,l)
{
	x = (x) ? x.toString().toLowerCase() : '';
	l = ((typeof l !== 'number')||(l < 0)) ? 0 : l;

	let r = '';
	for(let i=0;i<x.length;++i) {
		let c = x.charAt(i);
		if ('0123456789abcdef'.indexOf(c) >= 0) {
			r += c;
			if (r.length === l)
				break;
		}
	}

	while (r.length < l)
		r = '0' + r;

	return r;
};
exports.formatZeroTierIdentifier = formatZeroTierIdentifier;

/**
 * Goes through a rule set array and makes sure it's valid, returning a canonicalized version
 *
 * @param {array[object]} rules Array of ZeroTier rules
 * @return New array of canonicalized rules
 * @throws {Error} Rule set is invalid
 */
function formatRuleSetArray(rules)
{
	let r = [];
	if ((rules)&&(Array.isArray(rules))) {
		for(let a=0;a<rules.length;++a) {
			let rule = rules[a];
			if (rule.type) {
				let nr = null;
				switch(rule.type) {
					case 'ACTION_DROP':
					case 'ACTION_ACCEPT':
					case 'ACTION_BREAK':
						break;
					case 'ACTION_TEE':
					case 'ACTION_WATCH':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.address = formatZeroTierIdentifier(rule.address,10);
						nr.flags = parseInt(rule.flags)||0;
						nr['length'] = parseInt(rule['length'])||0;
						break;
					case 'ACTION_REDIRECT':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.address = formatZeroTierIdentifier(rule.address,10);
						nr.flags = parseInt(rule.flags)||0;
						break;
					case 'MATCH_SOURCE_ZEROTIER_ADDRESS':
					case 'MATCH_DEST_ZEROTIER_ADDRESS':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.zt = formatZeroTierIdentifier(rule.zt,10);
						break;
					case 'MATCH_VLAN_ID':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.vlanId = parseInt(rule.vlanId)||0;
						break;
					case 'MATCH_VLAN_PCP':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.vlanPcp = parseInt(rule.vlanPcp)||0;
						break;
					case 'MATCH_VLAN_DEI':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.vlanDei = parseInt(rule.vlanDei)||0;
						break;
					case 'MATCH_MAC_SOURCE':
					case 'MATCH_MAC_DEST':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.mac = formatZeroTierIdentifier(rule.mac,12);
						nr.mac = (nr.mac.substr(0,2)+':'+nr.mac.substr(2,2)+':'+nr.mac.substr(4,2)+':'+nr.mac.substr(6,2)+':'+nr.mac.substr(8,2)+':'+nr.mac.substr(10,2));
						break;
					case 'MATCH_IPV4_SOURCE':
					case 'MATCH_IPV4_DEST':
						if (ipClassify(rule.ip) !== 4)
							continue;
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.ip = rule.ip;
						break;
					case 'MATCH_IPV6_SOURCE':
					case 'MATCH_IPV6_DEST':
						if (ipClassify(rule.ip) !== 6)
							continue;
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.ip = rule.ip;
						break;
					case 'MATCH_IP_TOS':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.mask = parseInt(rule.mask)||0;
						nr.start = parseInt(rule.start)||0;
						nr.end = parseInt(rule.end)||0;
						break;
					case 'MATCH_IP_PROTOCOL':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.ipProtocol = parseInt(rule.ipProtocol)||0;
						break;
					case 'MATCH_ETHERTYPE':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.etherType = parseInt(rule.etherType)||0;
						break;
					case 'MATCH_ICMP':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.icmpType = parseInt(rule.icmpType)||0;
						nr.icmpCode = ('icmpCode' in rule) ? ((rule.icmpCode === null) ? null : (parseInt(rule.icmpCode)||0)) : null;
						break;
					case 'MATCH_IP_SOURCE_PORT_RANGE':
					case 'MATCH_IP_DEST_PORT_RANGE':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.start = parseInt(rule.start)||0;
						nr.end = parseInt(rule.end)||0;
						break;
					case 'MATCH_CHARACTERISTICS':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.mask = formatZeroTierIdentifier(rule.mask,16); // hex number, so this will work
						break;
					case 'MATCH_FRAME_SIZE_RANGE':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.start = parseInt(rule.start)||0;
						nr.end = parseInt(rule.end)||0;
						break;
					case 'MATCH_RANDOM':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.probability = parseInt(rule.probability)||0;
						break;
					case 'MATCH_TAGS_DIFFERENCE':
					case 'MATCH_TAGS_BITWISE_AND':
					case 'MATCH_TAGS_BITWISE_OR':
					case 'MATCH_TAGS_BITWISE_XOR':
					case 'MATCH_TAGS_EQUAL':
					case 'MATCH_TAG_SENDER':
					case 'MATCH_TAG_RECEIVER':
						nr = { 'type': rule['type'],'not': !!rule['not'],'or': !!rule['or'] };
						nr.id = parseInt(rule.id)||0;
						nr.value = parseInt(rule.value)||0;
						break;
					default:
						continue;
				}
				r.push(nr);
			}
		}
	}
	return r;
}
exports.formatRuleSetArray = formatRuleSetArray;

// Internal container classes
class _V4AssignMode
{
	get zt() { return (this._zt)||false; }
	set zt(b) { this._zt = !!b; }
	toJSON()
	{
		return { zt: this.zt };
	}
};
class _v6AssignMode
{
	get ['6plane']() { return (this._6plane)||false; }
	set ['6plane'](b) { this._6plane = !!b; }
	get zt() { return (this._zt)||false; }
	set zt(b) { this._zt = !!b; }
	get rfc4193() { return (this._rfc4193)||false; }
	set rfc4193(b) { this._rfc4193 = !!b; }
	toJSON()
	{
		return {
			zt: this.zt,
			rfc4193: this.rfc4193,
			'6plane': this['6plane']
		};
	}
}

class Network
{
	constructor(obj)
	{
		this.clear();
		this.patch(obj);
	}

	get objtype() { return 'network'; }

	get id() { return this._id; }
	set id(x) { return (this._id = formatZeroTierIdentifier(x,16)); }

	get nwid() { return this._id; } // legacy

	get authTokens() { return this._authTokens; }
	set authTokens(at)
	{
		this._authTokens = {};
		if ((at)&&(typeof at === 'object')&&(!Array.isArray(at))) {
			for(let k in at) {
				let exp = parseInt(at[k])||0;
				if (exp >= 0)
					this._authTokens[k] = exp;
			}
		}
		return this._authTokens;
	}

	get capabilities() { return this._capabilities; }
	set capabilities(c)
	{
		let ca = [];
		let ids = {};
		if ((c)&&(Array.isArray(c))) {
			for(let a=0;a<c.length;++a) {
				let cap = c[a];
				if ((cap)&&(typeof cap === 'object')&&(!Array.isArray(cap))) {
					let capId = parseInt(cap.id)||-1;
					if ((capId >= 0)&&(capId <= 0xffffffff)&&(!ids[capId])) {
						ids[capId] = true;
						let capDefault = !!cap['default'];
						let capRules = formatRuleSetArray(cap.rules);
						ca.push({
							id: capId,
							'default': capDefault,
							rules: capRules
						});
					}
				}
			}
		}
		ca.sort(function(a,b) {
			a = a.id;
			b = b.id;
			return ((a > b) ? 1 : ((a < b) ? -1 : 0));
		});
		this._capabilities = ca;
		return ca;
	}

	get ipAssignmentPools() { return this._ipAssignmentPools; }
	set ipAssignmentPools(ipp)
	{
		let pa = [];
		let ranges = {};
		if ((ipp)&&(Array.isArray(ipp))) {
			for(let a=0;a<ipp.length;++a) {
				let range = ipp[a];
				if ((range)&&(typeof range === 'object')&&(!Array.isArray(range))) {
					let start = range.ipRangeStart;
					let end = range.ipRangeEnd;
					if ((start)&&(end)) {
						let stype = ipClassify(start);
						if ((stype > 0)&&(stype === ipClassify(end))&&(!ranges[start+'_'+end])) {
							ranges[start+'_'+end] = true;
							pa.push({ ipRangeStart: start, ipRangeEnd: end });
						}
					}
				}
			}
		}
		pa.sort(function(a,b) { return a.ipRangeStart.localeCompare(b.ipRangeStart); });
		this._ipAssignmentPools = pa;
		return pa;
	}

	get multicastLimit() { return this._multicastLimit; }
	set multicastLimit(n)
	{
		try {
			let nn = parseInt(n)||0;
			this._multicastLimit = (nn >= 0) ? nn : 0;
		} catch (e) {
			this._multicastLimit = 0;
		}
		return this._multicastLimit;
	}

	get routes() { return this._routes; }
	set routes(r)
	{
		let ra = [];
		let targets = {};
		if ((r)&&(Array.isArray(r))) {
			for(let a=0;a<r.length;++a) {
				let route = r[a];
				if ((route)&&(typeof route === 'object')&&(!Array.isArray(route))) {
					let routeTarget = route.target;
					let routeVia = route.via||null;
					let rtt = ipClassify(routeTarget);
					if ((rtt > 0)&&((routeVia === null)||(ipClassify(routeVia) === rtt))&&(!targets[routeTarget])) {
						targets[routeTarget] = true;
						ra.push({ target: routeTarget, via: routeVia });
					}
				}
			}
		}
		ra.sort(function(a,b) { return a.routeTarget.localeCompare(b.routeTarget); });
		this._routes = ra;
		return ra;
	}

	get tags() { return this._tags; }
	set tags(t)
	{
		let ta = [];
		if ((t)&&(Array.isArray(t))) {
			for(let a=0;a<t.length;++a) {
				let tag = t[a];
				if ((tag)&&(typeof tag === 'object')&&(!Array.isArray(tag))) {
					let tagId = parseInt(tag.id)||-1;
					if ((tagId >= 0)||(tagId <= 0xffffffff)) {
						let tagDefault = tag.default;
						if (typeof tagDefault !== 'number')
							tagDefault = parseInt(tagDefault)||null;
						if ((tagDefault < 0)||(tagDefault > 0xffffffff))
							tagDefault = null;
						ta.push({ 'id': tagId, 'default': tagDefault });
					}
				}
			}
		}
		ta.sort(function(a,b) {
			a = a.id;
			b = b.id;
			return ((a > b) ? 1 : ((a < b) ? -1 : 0));
		});
		this._tags = ta;
		return ta;
	}

	get v4AssignMode() { return this._v4AssignMode; }
	set v4AssignMode(m)
	{
		if ((m)&&(typeof m === 'object')&&(!Array.isArray(m))) {
			this._v4AssignMode.zt = m.zt;
		} else if (m === 'zt') { // legacy
			this._v4AssignMode.zt = true;
		} else {
			this._v4AssignMode.zt = false;
		}
	}

	get v6AssignMode() { return this._v6AssignMode; }
	set v6AssignMode(m)
	{
		if ((m)&&(typeof m === 'object')&&(!Array.isArray(m))) {
			this._v6AssignMode.zt = m.zt;
			this._v6AssignMode.rfc4193 = m.rfc4193;
			this._v6AssignMode['6plane'] = m['6plane'];
		} else if (typeof m === 'string') { // legacy
			let ms = m.split(',');
			this._v6AssignMode.zt = false;
			this._v6AssignMode.rfc4193 = false;
			this._v6AssignMode['6plane'] = false;
			for(let i=0;i<ms.length;++i) {
				switch(ms[i]) {
					case 'zt':
						this._v6AssignMode.zt = true;
						break;
					case 'rfc4193':
						this._v6AssignMode.rfc4193 = true;
						break;
					case '6plane':
						this._v6AssignMode['6plane'] = true;
						break;
				}
			}
		} else {
			this._v6AssignMode.zt = false;
			this._v6AssignMode.rfc4193 = false;
			this._v6AssignMode['6plane'] = false;
		}
	}

	get rules() { return this._rules; }
	set rules(r) { this._rules = formatRuleSetArray(r); }

	get enableBroadcast() { return this._enableBroadcast; }
	set enableBroadcast(b) { this._enableBroadcast = !!b; }

	get mtu() { return this._mtu; }
	set mtu(n)
	{
		let mtu = parseInt(n)||0;
		if (mtu <= 1280) mtu = 1280; // minimum as per IPv6 spec
		if (mtu >= 10000) mtu = 10000; // maximum as per ZT spec
		this._mtu = mtu;
	}

	get name() { return this._name; }
	set name(n)
	{
		if (typeof n === 'string')
			this._name = n;
		else if (typeof n === 'number')
			this._name = n.toString();
		else this._name = '';
	}

	get private() { return this._private; }
	set private(b)
	{
		// This is really meaningful for security, so make true unless explicitly set to false.
		this._private = (b !== false);
	}

	get activeMemberCount() { return this.__activeMemberCount; }
	get authorizedMemberCount() { return this.__authorizedMemberCount; }
	get totalMemberCount() { return this.__totalMemberCount; }
	get clock() { return this.__clock; }
	get creationTime() { return this.__creationTime; }
	get revision() { return this.__revision; }

	toJSONExcludeControllerGenerated()
	{
		return {
			id: this.id,
			objtype: 'network',
			nwid: this.nwid,
			authTokens: this.authTokens,
			capabilities: this.capabilities,
			ipAssignmentPools: this.ipAssignmentPools,
			multicastLimit: this.multicastLimit,
			routes: this.routes,
			tags: this.tags,
			v4AssignMode: this._v4AssignMode.toJSON(),
			v6AssignMode: this._v6AssignMode.toJSON(),
			rules: this.rules,
			enableBroadcast: this.enableBroadcast,
			mtu: this.mtu,
			name: this.name,
			'private': this['private']
		};
	}

	toJSON()
	{
		var j = this.toJSONExcludeControllerGenerated();
		j.activeMemberCount = this.activeMemberCount;
		j.authorizedMemberCount = this.authorizedMemberCount;
		j.totalMemberCount = this.totalMemberCount;
		j.clock = this.clock;
		j.creationTime = this.creationTime;
		j.revision = this.revision;
		return j;
	}

	clear()
	{
		this._id = '';
		this._authTokens = {};
		this._capabilities = [];
		this._ipAssignmentPools = [];
		this._multicastLimit = 32;
		this._routes = [];
		this._tags = [];
		this._v4AssignMode = new _V4AssignMode();
		this._v6AssignMode = new _v6AssignMode();
		this._rules = [];
		this._enableBroadcast = true;
		this._mtu = 2800;
		this._name = '';
		this._private = true;

		this.__activeMemberCount = 0;
		this.__authorizedMemberCount = 0;
		this.__totalMemberCount = 0;
		this.__clock = 0;
		this.__creationTime = 0;
		this.__revision = 0;
	}

	patch(obj)
	{
		if (obj instanceof Network)
			obj = obj.toJSON();
		if ((obj)&&(typeof obj === 'object')&&(!Array.isArray(obj))) {
			for(var k in obj) {
				try {
					switch(k) {
						case 'id':
						case 'authTokens':
						case 'capabilities':
						case 'ipAssignmentPools':
						case 'multicastLimit':
						case 'routes':
						case 'tags':
						case 'rules':
						case 'enableBroadcast':
						case 'mtu':
						case 'name':
						case 'private':
						case 'v4AssignMode':
						case 'v6AssignMode':
							this[k] = obj[k];
							break;

						case 'activeMemberCount':
						case 'authorizedMemberCount':
						case 'totalMemberCount':
						case 'clock':
						case 'creationTime':
						case 'revision':
							this['__'+k] = parseInt(obj[k])||0;
							break;
					}
				} catch (e) {}
			}
		}
	}
};
exports.Network = Network;

class Member
{
	constructor(obj)
	{
		this.clear();
		this.patch(obj);
	}

	get objtype() { return 'member'; }

	get id() { return this._id; }
	set id(x) { this._id = formatZeroTierIdentifier((typeof x === 'number') ? x.toString(16) : x,10); }

	get address() { return this._id; } // legacy

	get nwid() { return this._nwid; }
	set nwid(x) { this._nwid = formatZeroTierIdentifier(x,16); }

	get controllerId() { return this.nwid.substr(0,10); }

	get authorized() { return this._authorized; }
	set authorized(b) { this._authorized = (b === true); } // security critical so require explicit set to true

	get activeBridge() { return this._activeBridge; }
	set activeBridge(b) { this._activeBridge = !!b; }

	get capabilities() { return this._capabilities; }
	set capabilities(c)
	{
		let caps = {};
		let ca = [];
		if ((c)&&(Array.isArray(c))) {
			for(let a=0;a<c.length;++a) {
				let capId = parseInt(c[a])||0;
				if ((capId >= 0)&&(capId <= 0xffffffff)&&(!caps[capId])) {
					caps[capId] = true;
					ca.push(capId);
				}
			}
		}
		ca.sort();
		this._capabilities = ca;
		return ca;
	}

	get identity() { return this._identity; }
	set identity(istr)
	{
		if ((istr)&&(typeof istr === 'string'))
			this._identity = istr;
		else this._identity = null;
	}

	get ipAssignments() { return this._ipAssignments; }
	set ipAssignments(ipa)
	{
		let ips = {};
		if ((ipa)&&(Array.isArray(ipa))) {
			for(let a=0;a<ipa.length;++a) {
				let ip = ipa[a];
				if (ipClassify(ip) > 0)
					ips[ip] = true;
			}
		}
		this._ipAssignments = Object.keys(ips);
		this._ipAssignments.sort();
		return this._ipAssignments;
	}

	get noAutoAssignIps() { return this._noAutoAssignIps; }
	set noAutoAssignIps(b) { this._noAutoAssignIps = !!b; }

	get tags() { return this._tags; }
	set tags(t)
	{
		let ta = [];
		let pairs = {};
		if ((t)&&(Array.isArray(t))) {
			for(let a=0;a<t.length;++a) {
				let tag = a[t];
				if ((tag)&&(Array.isArray(tag))&&(tag.length === 2)) {
					let tagId = parseInt(tag[0])||0;
					let tagValue = parseInt(tag[1])||0;
					let pk = tagId.toString()+'_'+tagValue.toString();
					if ((tagId >= 0)&&(tagId <= 0xffffffff)&&(tagValue >= 0)&&(tagValue <= 0xffffffff)&&(!pairs[pk])) {
						pairs[pk] = true;
						ta.push([ tagId,tagValue ]);
					}
				}
			}
		}
		ta.sort(function(a,b) {
			return ((a[0] < b[0]) ? -1 : ((a[0] > b[0]) ? 1 : 0));
		});
		this._tags = ta;
		return ta;
	}

	get creationTime() { return this.__creationTime; }
	get lastAuthorizedTime() { return this.__lastAuthorizedTime; }
	get lastAuthorizedCredentialType() { return this.__lastAuthorizedCredentialType; }
	get lastAuthorizedCredential() { return this.__lastAuthorizedCredential; }
	get lastDeauthorizedTime() { return this.__lastDeauthorizedTime; }
	get physicalAddr() { return this.__physicalAddr; }
	get revision() { return this.__revision; }
	get vMajor() { return this.__vMajor; }
	get vMinor() { return this.__vMinor; }
	get vRev() { return this.__vRev; }
	get vProto() { return this.__vProto; }

	toJSONExcludeControllerGenerated()
	{
		return {
			id: this.id,
			nwid: this.nwid,
			objtype: 'member',
			address: this.id,
			authorized: this.authorized,
			activeBridge: this.activeBridge,
			capabilities: this.capabilities,
			identity: this.identity,
			ipAssignments: this.ipAssignments,
			noAutoAssignIps: this.noAutoAssignIps,
			tags: this.tags
		};
	}

	toJSON()
	{
		let j = this.toJSONExcludeControllerGenerated();
		j.creationTime = this.creationTime;
		j.lastAuthorizedTime = this.lastAuthorizedTime;
		j.lastAuthorizedCredentialType = this.lastAuthorizedCredentialType;
		j.lastAuthorizedCredential = this.lastAuthorizedCredential;
		j.lastDeauthorizedTime = this.lastDeauthorizedTime;
		j.physicalAddr = this.physicalAddr;
		j.revision = this.revision;
		j.vMajor = this.vMajor;
		j.vMinor = this.vMinor;
		j.vRev = this.vRev;
		j.vProto = this.vProto;
		return j;
	}

	clear()
	{
		this._id = '';
		this._nwid = '';
		this._authorized = false;
		this._activeBridge = false;
		this._capabilities = [];
		this._identity = '';
		this._ipAssignments = [];
		this._noAutoAssignIps = false;
		this._tags = [];

		this.__creationTime = 0;
		this.__lastAuthorizedTime = 0;
		this.__lastAuthorizedCredentialType = null;
		this.__lastAuthorizedCredential = null;
		this.__lastDeauthorizedTime = 0;
		this.__physicalAddr = '';
		this.__revision = 0;
		this.__vMajor = 0;
		this.__vMinor = 0;
		this.__vRev = 0;
		this.__vProto = 0;
	}

	patch(obj)
	{
		if (obj instanceof Member)
			obj = obj.toJSON();
		if ((obj)&&(typeof obj === 'object')&&(!Array.isArray(obj))) {
			for(var k in obj) {
				try {
					switch(k) {
						case 'id':
						case 'nwid':
						case 'authorized':
						case 'activeBridge':
						case 'capabilities':
						case 'identity':
						case 'ipAssignments':
						case 'noAutoAssignIps':
						case 'tags':
							this[k] = obj[k];
							break;

						case 'creationTime':
						case 'lastAuthorizedTime':
						case 'lastAuthorizedCredentialType':
						case 'lastAuthorizedCredential':
						case 'lastDeauthorizedTime':
						case 'physicalAddr':
						case 'revision':
						case 'vMajor':
						case 'vMinor':
						case 'vRev':
						case 'vProto':
							this['__'+k] = parseInt(obj[k])||0;
							break;
					}
				} catch (e) {}
			}
		}
	}
};
exports.Member = Member;
