// Accounting.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, ScrollViewComponent, ScrollViewBase } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firebase from 'firebase/compat';
import { db } from '../Firebase';
import { Divider } from 'react-native-elements';

function Accounting({ navigation }) {
    const [transactions, setTransactions] = useState([]);
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchAccountingData();
    }, []);

    const fetchAccountingData = async () => {
        setIsLoading(true);
        const currentUser = firebase.auth().currentUser;

        if (currentUser) {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data() || {};
            const userTransactions = userData.transactions || [];

            const offersSnapshot = await db.collection('offers')
                .where('createdBy', '==', currentUser.uid)
                .get();

            const sentOffersSnapshot = await db.collection('offers')
                .where('applicantId', '==', currentUser.uid)
                .get();

            const offersData = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sentOffersData = sentOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setTransactions(userTransactions);
            setOffers([...offersData, ...sentOffersData]);
            setIsLoading(false);
        }
    };
    const renderTransactionItem = ({ item }) => {
        const userDoc =  db.collection('offers').doc(item.completedOfferId).get();
        return (
            <View style={styles.transactionItem}>
                <TouchableOpacity onPress={()=>null}>
                    <Text style={styles.transactionStatus}>{item.status}</Text>
                    <View style={{ flexDirection: "row" }}>
                        <Text style={styles.transactionLabel}>Amount: </Text>
                        <Text style={[styles.transactionAmount, { color: item.status === 'Experience Buy' ? 'red' : 'green' }]}>
                            ${item.amount}
                        </Text>
                    </View>
                    <Text style={styles.transactionTimestamp}>
                        {item.timestamp} ({item.timezone})
                    </Text>
                </TouchableOpacity>
            </View>
        )
    };
    const renderOfferItem = ({ item }) => {
        const currentUser = firebase.auth().currentUser;
        const isCreatedByCurrentUser = currentUser && item.createdBy === currentUser.uid;    
        const isAcceptedOffer = item.status === 'accepted';
        if (!isAcceptedOffer) {
            return null;
        }   
        return (
            <View style={styles.offerItem}>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.offerDescription}>{item.description}</Text>
                <Divider style={styles.divider} />
                <View style={{ flexDirection: "row" }}>
                    <Text style={styles.offerPrice}>Offer Price:</Text>
                    <Text style={[styles.offerPrice, { color: isCreatedByCurrentUser ? 'red' : 'green' }]}> ${item.offerPrice}</Text>
                </View>
                <Text style={styles.offerTimestamp}>
                    {item.timestamp.toDate().toLocaleString()}
                </Text>
            </View>
        );
    };    

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-left" size={25} color="#000" />
            </TouchableOpacity>
            <View style={styles.containerIn}>
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0000ff" />
                    </View>
                )}
                {!isLoading && (
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerText}>Offers History</Text>
                        <FlatList
                            data={offers}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderOfferItem}
                            ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                            refreshing={isLoading}
                            onRefresh={fetchAccountingData}
                        />
                    </View>
                )}
                <Divider style={{ marginVertical: 20, backgroundColor: '#000', height: 1 }} />
                {!isLoading && (
                    <View style={{ flex: 1, paddingBottom: 20 }}>
                        <Text style={styles.headerText}>Balance Purchases</Text>
                        <FlatList
                            data={transactions.reverse()}
                            keyExtractor={(item, index) => item.id || index.toString()} 
                            renderItem={renderTransactionItem}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
    },
    containerIn: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        top: 50,
    },
    backButton: {
        position: "relative",
        top: 50,
        left: 20,
        zIndex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    transactionItem: {
        padding: 10,
        borderRadius: 8,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 10,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    transactionTimestamp: {
        fontSize: 14,
        color: '#555',
    },
    offerItem: {
        padding: 10,
        borderRadius: 8,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    offerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    offerDescription: {
        fontSize: 16,
        marginBottom: 5,
    },
    divider: {
        marginVertical: 10,
        backgroundColor: '#ddd',
    },
    offerPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    offerTimestamp: {
        fontSize: 14,
        color: '#555',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
});

export default Accounting;
