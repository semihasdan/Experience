import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Dimensions, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../Firebase';
import Logo from '../../assets/Logo.png';
import firebase from 'firebase/compat';
import { formatDistanceToNow } from 'date-fns';

const Search = ({ navigation }) => {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        const fetchJobPostings = async () => {
            try {
                const snapshot = await db.collection('jobPostings').get();
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setSearchResults(data);
            } catch (error) {
                console.error('Error fetching job postings', error);
            }
        };

        fetchJobPostings();

        const unsubscribe = db.collection('jobPostings').onSnapshot((snapshot) => {
            const updatedJobPostings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setSearchResults(updatedJobPostings);
        });

        return () => unsubscribe();
    }, []);

    const filterResults = (item) => {
        const keywordsMatch = item.keywords?.some((keyword) =>
            keyword.toLowerCase().includes(searchText.toLowerCase())
        );
        const descriptionMatch = item.description.toLowerCase().includes(searchText.toLowerCase());
        const skillsMatch = item.skills.toLowerCase().includes(searchText.toLowerCase());
        const titleMatch = item.title.toLowerCase().includes(searchText.toLowerCase());
        const locationMatch = item.location.toLowerCase().includes(searchText.toLowerCase());

        const isUserCreatedJob = item.createdBy === firebase.auth().currentUser?.uid;

        return (
            (keywordsMatch || descriptionMatch || skillsMatch || titleMatch || locationMatch) &&
            !isUserCreatedJob
        );
    };
    const handleApply = (jobDetails) => {
        navigation.navigate('ApplyScreen', { jobDetails });
    };
    const handleSave = (jobId) => {
        console.log(`Job ${jobId} saved`);
    };

    const filteredResults = searchResults.filter(filterResults).filter((job) => job.status !== 'deleted')
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Search Jobs</Text>
                <Image source={Logo} style={styles.headerLogo}/>
            </View>
            <View style={styles.searchBoxWrapper}>
                <TextInput
                    placeholder="Search Expected Experience"
                    style={styles.searchBox}
                    onChangeText={(text) => setSearchText(text)}
                    value={searchText}
                />
                <Icon name="magnify" size={20} style={styles.searchIcon} />
            </View>
            <FlatList
                data={filteredResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.jobContainer}>
                            <Text style={styles.jobTitle}>{item.title}</Text>
                            {item.description.length > 200 ? (
                                <Text style={styles.jobDescription}>
                                    {showFullDescription ? item.description : `${item.description.slice(0, 150)}... `}
                                    <Text
                                        style={{ color: 'green', fontWeight: 'bold' }}
                                        onPress={() => setShowFullDescription(!showFullDescription)}
                                    >
                                        {showFullDescription ? ' see less' : ' see more'}
                                    </Text>
                                </Text>
                            ) : (
                                <Text style={styles.jobDescription}>{item.description}</Text>
                            )}
                            <View style={styles.infoContainer}>
                                <Icon name="calendar" size={16} style={styles.icon} />
                                <Text style={styles.jobInfo}>{formatDistanceToNow(new Date(item.publishedTime), { addSuffix: true })}</Text>
                                <Icon name="map-marker" size={16} color="#008000" style={styles.icon} />
                                <Text style={styles.jobInfo}>{item.location}</Text>
                                <Text style={styles.jobInfo1}>-  {item.price}$</Text>
                            </View>
                            <View style={styles.skillsContainer}>
                                <Text style={styles.jobDescription}>
                                    <Text style={{ fontWeight: 'bold' }}>Expected Experience: </Text>
                                    {item.skills}
                                </Text>
                            </View>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.savedButton} onPress={() => handleSave(item.id)}>
                                    <Icon name={'heart-outline'} size={24} color={'black'} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(item)}>
                                    <Text style={styles.applyButtonText}>Apply Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => null}
                                    style={styles.shareButton}
                                >
                                    <Icon
                                        name="share-variant"
                                        size={24}
                                        color="#333"
                                    />
                                </TouchableOpacity>
                            </View>
                    </View>
                )}
            />
        </View>
    );
};

const { width, height } = Dimensions.get('window');
const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: rh(2),
        paddingHorizontal: rw(2),
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: "row",
        top: rw(8),
    },
    headerText: {
        position: "absolute",
        fontSize: rw(6),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    headerLogo: {
        width: rw(18),
        height: rh(6),
        top: rw(0),
        bottom: rw(2),
        left: rw(40),
    },   
    searchBoxWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ccc',
        borderRadius: rw(5),
        paddingHorizontal: rw(4),
        marginBottom: rh(0.5),
        marginTop: rh(4),
    },
    searchBox: {
        flex: 1,
        fontSize: rw(4),
        paddingVertical: rh(0.5),
        marginLeft: rw(2),
    },
    searchIcon: {
        color: '#333',
    },
    jobContainer: {
        padding: rw(2),
        backgroundColor: '#fff',
        borderRadius: rw(2.5),
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: rw(1),
        elevation: 3,
        marginBottom: rh(1),
        top: rh(0),
    },
    jobTitle: {
        fontSize: rw(5),
        fontWeight: 'bold',
    },
    jobDescription: {
        fontSize: rw(4),
        color: '#666',
    },
    infoContainer: {
        flexDirection: 'row',
        marginTop: rh(0.5),
    },
    jobInfo: {
        fontSize: rw(3.5),
        color: '#666',
        marginRight: rw(2),
    },
    jobInfo1: {
        fontSize: rw(3.5),
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: rh(1),
    },
    savedButton: {
        marginRight: rw(2),
    },
    applyButton: {
        backgroundColor: '#008000',
        paddingVertical: rh(1),
        paddingHorizontal: rw(4),
        borderRadius: rw(5),
    },
    applyButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    shareButton: {
        position: 'absolute',
        left: rw(85),
    },
    divider: {
        height: rh(0.2),
        backgroundColor: '#e1e1e1',
    },
});

export default Search;
